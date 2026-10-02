import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { getFaceLandmarker } from "../lib/faceLandmarkerClient";
import {
  avg,
  classifyExpression,
  computeEAR,
  computeHeadPose,
  getScore,
  type Expression,
} from "../lib/faceAnalysis";

export type TrackingStatus =
  | "idle"
  | "loading-model"
  | "requesting-camera"
  | "running"
  | "no-face"
  | "error";

export interface BlinkEvent {
  time: number;
  durationMs: number;
}

export interface FaceMetrics {
  faceDetected: boolean;
  eyeOpenness: number; // 0..1 (1 = fully open)
  earLeft: number;
  earRight: number;
  smile: number;
  browRaise: number;
  browDown: number;
  jawOpen: number;
  frown: number;
  squint: number;
  cheekPuff: number;
  mouthPucker: number;
  yaw: number;
  pitch: number;
  roll: number;
  expression: Expression;
}

const CLOSED_THRESHOLD = 0.42;
const OPEN_THRESHOLD = 0.25;
const MAX_BLINK_MS = 1200;
const HISTORY_LIMIT = 200;

const emptyMetrics: FaceMetrics = {
  faceDetected: false,
  eyeOpenness: 1,
  earLeft: 0,
  earRight: 0,
  smile: 0,
  browRaise: 0,
  browDown: 0,
  jawOpen: 0,
  frown: 0,
  squint: 0,
  cheekPuff: 0,
  mouthPucker: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  expression: "Neutral",
};

export function useFaceTracking() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FaceMetrics>(emptyMetrics);
  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkHistory, setBlinkHistory] = useState<BlinkEvent[]>([]);
  const [fps, setFps] = useState(0);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<FaceLandmarkerResult | null>(null);

  const eyeStateRef = useRef<"open" | "closed">("open");
  const closeStartRef = useRef<number>(0);
  const blinkCountRef = useRef(0);
  const blinkHistoryRef = useRef<BlinkEvent[]>([]);
  const frameTimesRef = useRef<number[]>([]);
  const lastUiUpdateRef = useRef(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStatus("idle");
    setSessionStart(null);
  }, []);

  const resetStats = useCallback(() => {
    blinkCountRef.current = 0;
    blinkHistoryRef.current = [];
    setBlinkCount(0);
    setBlinkHistory([]);
    setSessionStart(Date.now());
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);
    try {
      setStatus("loading-model");
      const landmarker = await getFaceLandmarker();

      setStatus("requesting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element not ready");
      video.srcObject = stream;
      await video.play();

      setStatus("running");
      setSessionStart(Date.now());
      blinkCountRef.current = 0;
      blinkHistoryRef.current = [];
      setBlinkCount(0);
      setBlinkHistory([]);
      eyeStateRef.current = "open";

      const loop = () => {
        const v = videoRef.current;
        if (!v || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const now = performance.now();
        const result = landmarker.detectForVideo(v, now);
        setLatestResult(result);

        // FPS tracking
        const times = frameTimesRef.current;
        times.push(now);
        while (times.length && now - times[0] > 1000) times.shift();

        const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0;

        if (hasFace) {
          const landmarks = result.faceLandmarks[0];
          const categories = result.faceBlendshapes?.[0]?.categories;

          const blinkL = getScore(categories, "eyeBlinkLeft");
          const blinkR = getScore(categories, "eyeBlinkRight");
          const blinkScore = avg(blinkL, blinkR);
          const eyeOpenness = Math.max(0, Math.min(1, 1 - blinkScore));

          const { leftEAR, rightEAR } = computeEAR(landmarks);
          const { yaw, pitch, roll } = computeHeadPose(landmarks);

          const smile = avg(getScore(categories, "mouthSmileLeft"), getScore(categories, "mouthSmileRight"));
          const browRaise = avg(
            getScore(categories, "browOuterUpLeft"),
            getScore(categories, "browOuterUpRight"),
            getScore(categories, "browInnerUp"),
          );
          const browDown = avg(getScore(categories, "browDownLeft"), getScore(categories, "browDownRight"));
          const jawOpen = getScore(categories, "jawOpen");
          const frown = avg(getScore(categories, "mouthFrownLeft"), getScore(categories, "mouthFrownRight"));
          const squint = avg(getScore(categories, "eyeSquintLeft"), getScore(categories, "eyeSquintRight"));
          const cheekPuff = getScore(categories, "cheekPuff");
          const mouthPucker = getScore(categories, "mouthPucker");

          const expression = classifyExpression({
            smile,
            browRaise,
            browDown,
            jawOpen,
            frown,
            squint,
            eyeOpenness,
          });

          // Blink edge detection with hysteresis
          if (eyeStateRef.current === "open" && blinkScore > CLOSED_THRESHOLD) {
            eyeStateRef.current = "closed";
            closeStartRef.current = now;
          } else if (eyeStateRef.current === "closed" && blinkScore < OPEN_THRESHOLD) {
            eyeStateRef.current = "open";
            const duration = now - closeStartRef.current;
            if (duration > 30 && duration < MAX_BLINK_MS) {
              blinkCountRef.current += 1;
              const ev: BlinkEvent = { time: Date.now(), durationMs: duration };
              blinkHistoryRef.current = [...blinkHistoryRef.current, ev].slice(-HISTORY_LIMIT);
              setBlinkCount(blinkCountRef.current);
              setBlinkHistory(blinkHistoryRef.current);
            }
          }

          // Throttle React state updates to ~20fps for perf
          if (now - lastUiUpdateRef.current > 50) {
            lastUiUpdateRef.current = now;
            setMetrics({
              faceDetected: true,
              eyeOpenness,
              earLeft: leftEAR,
              earRight: rightEAR,
              smile,
              browRaise,
              browDown,
              jawOpen,
              frown,
              squint,
              cheekPuff,
              mouthPucker,
              yaw,
              pitch,
              roll,
              expression,
            });
            setStatus("running");
            setFps(times.length);
          }
        } else if (now - lastUiUpdateRef.current > 50) {
          lastUiUpdateRef.current = now;
          setMetrics((m) => ({ ...m, faceDetected: false }));
          setStatus("no-face");
          setFps(times.length);
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Could not access camera.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    canvasRef,
    status,
    errorMessage,
    metrics,
    blinkCount,
    blinkHistory,
    fps,
    sessionStart,
    latestResult,
    start,
    stop,
    resetStats,
  };
}
