import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { cn } from "@/utils/cn";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [blinkScore, setBlinkScore] = useState(0);
  const [threshold, setThreshold] = useState(0.5);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  const isBlinkingRef = useRef(false);
  const isRunningRef = useRef(false);

  // Load the MediaPipe face landmarker once on mount.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        faceLandmarkerRef.current = landmarker;
        setIsLoading(false);
      } catch {
        setError(
          "Failed to load the face-tracking model. Please check your connection and refresh."
        );
        setIsLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      stopCamera();
      faceLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    if (!faceLandmarkerRef.current || isWatching || isRunningRef.current) return;
    setError(null);
    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          isRunningRef.current = true;
          setIsWatching(true);
          setIsStarting(false);
          detectFrame();
        };
      }
    } catch {
      setIsStarting(false);
      setError(
        "Could not access your webcam. Please allow camera permission and try again."
      );
    }
  };

  const stopCamera = () => {
    isRunningRef.current = false;

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setIsWatching(false);
  };

  const detectFrame = () => {
    if (!isRunningRef.current) return;

    if (videoRef.current && canvasRef.current && faceLandmarkerRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const result = faceLandmarkerRef.current.detectForVideo(
          video,
          performance.now()
        );

        drawFace(canvas, result);
        processBlink(result);
      }
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  };

  const processBlink = (result: FaceLandmarkerResult) => {
    const blendshapes = result.faceBlendshapes;
    if (!blendshapes || blendshapes.length === 0) return;

    const categories = blendshapes[0].categories;
    const leftBlink =
      categories.find((c) => c.categoryName === "eyeBlinkLeft")?.score ?? 0;
    const rightBlink =
      categories.find((c) => c.categoryName === "eyeBlinkRight")?.score ?? 0;

    const score = (leftBlink + rightBlink) / 2;
    setBlinkScore(score);

    if (score > threshold && !isBlinkingRef.current) {
      isBlinkingRef.current = true;
      setBlinkCount((count) => count + 1);
    } else if (score < threshold) {
      isBlinkingRef.current = false;
    }
  };

  const drawFace = (canvas: HTMLCanvasElement, result: FaceLandmarkerResult) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return;

    const landmarks = result.faceLandmarks[0];
    ctx.fillStyle = "#22c55e";

    for (const point of landmarks) {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const resetCount = () => {
    setBlinkCount(0);
    isBlinkingRef.current = false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-zinc-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-200">
            <svg
              className="h-7 w-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
              <path d="M4 4l2 2" />
              <path d="M18 4l2 2" />
              <path d="M4 20l2-2" />
              <path d="M18 20l2-2" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Blink Watcher</h1>
          <p className="mt-1 text-slate-500">
            Use your webcam to count how many times you blink.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200">
          <div className="relative aspect-[4/3] w-full bg-slate-950">
            {!isWatching && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 text-white">
                <div className="rounded-full bg-white/10 p-4 backdrop-blur-sm">
                  <svg
                    className="h-8 w-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
                <p className="text-sm font-medium opacity-80">
                  Camera preview is off
                </p>
              </div>
            )}

            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 h-full w-full -scale-x-100 transform object-cover",
                !isWatching && "opacity-0"
              )}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className={cn(
                "pointer-events-none absolute inset-0 h-full w-full -scale-x-100 transform object-cover",
                !isWatching && "opacity-0"
              )}
            />
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-6 text-center">
              <span className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Blinks
              </span>
              <span className="mt-2 text-6xl font-bold text-slate-900 tabular-nums">
                {blinkCount}
              </span>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    blinkScore > threshold ? "bg-green-500" : "bg-slate-300"
                  )}
                />
                {blinkScore > threshold ? "Blink detected" : "Eyes open"}
              </div>
            </div>

            <div className="space-y-5 rounded-2xl bg-slate-50 p-6">
              <div>
                <label
                  htmlFor="threshold"
                  className="flex items-center justify-between text-sm font-medium text-slate-700"
                >
                  Sensitivity
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm">
                    {Math.round(threshold * 100)}%
                  </span>
                </label>
                <input
                  id="threshold"
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="mt-3 w-full accent-indigo-600"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Increase if blinks are missed; decrease if it counts too often.
                </p>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Eye closure score</span>
                <span className="font-mono font-medium">
                  {blinkScore.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={isWatching ? stopCamera : startCamera}
                  disabled={isLoading || isStarting}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    isWatching
                      ? "bg-rose-500 hover:bg-rose-600 focus:ring-rose-300"
                      : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300"
                  )}
                >
                  {isLoading
                    ? "Loading model..."
                    : isStarting
                    ? "Starting camera..."
                    : isWatching
                    ? "Stop watching"
                    : "Start watching"}
                </button>
                <button
                  onClick={resetCount}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          All processing happens in your browser. Your video never leaves your
          device.
        </p>
      </div>
    </div>
  );
}
