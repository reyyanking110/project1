import { useEffect, useRef } from "react";
import { DrawingUtils, FaceLandmarker, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { TrackingStatus } from "../hooks/useFaceTracking";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  result: FaceLandmarkerResult | null;
  status: TrackingStatus;
}

export default function CameraView({ videoRef, canvasRef, result, status }: Props) {
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    if (!drawingUtilsRef.current) {
      drawingUtilsRef.current = new DrawingUtils(ctx);
    }
    const drawingUtils = drawingUtilsRef.current;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result && result.faceLandmarks) {
      for (const landmarks of result.faceLandmarks) {
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
          color: "#ffffff14",
          lineWidth: 1,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
          color: "#f472b6aa",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
          color: "#22d3ee",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
          color: "#67e8f9",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
          color: "#a78bfa",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
          color: "#c4b5fd",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
          color: "#fbbf24",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, {
          color: "#34d399",
          lineWidth: 2,
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {
          color: "#34d399",
          lineWidth: 2,
        });
      }
    }
    ctx.restore();
  }, [result, videoRef, canvasRef]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40">
      <div className="absolute inset-0 -scale-x-100">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      {status !== "running" && status !== "no-face" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <StatusMessage status={status} />
        </div>
      )}

      {status === "no-face" && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-amber-500/90 px-4 py-1.5 text-sm font-medium text-black shadow-lg">
          No face detected — center your face in frame
        </div>
      )}

      {status === "running" && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-black shadow">
          <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
          LIVE
        </div>
      )}
    </div>
  );
}

function StatusMessage({ status }: { status: TrackingStatus }) {
  switch (status) {
    case "loading-model":
      return <Spinner label="Loading face AI model…" />;
    case "requesting-camera":
      return <Spinner label="Requesting camera access…" />;
    case "error":
      return (
        <p className="max-w-xs text-center text-sm text-red-300">
          Something went wrong starting the camera. Check permissions and try again.
        </p>
      );
    default:
      return (
        <p className="max-w-xs text-center text-sm text-slate-300">
          Press “Start tracking” to begin blink &amp; face analysis.
        </p>
      );
  }
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="text-sm text-slate-300">{label}</p>
    </div>
  );
}
