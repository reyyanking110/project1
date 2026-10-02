import { useEffect, useMemo, useState } from "react";
import CameraView from "./components/CameraView";
import StatCard from "./components/StatCard";
import MetricBar from "./components/MetricBar";
import ExpressionBadge from "./components/ExpressionBadge";
import BlinkHistoryChart from "./components/BlinkHistoryChart";
import HeadPoseIndicator from "./components/HeadPoseIndicator";
import { useFaceTracking } from "./hooks/useFaceTracking";
import { headDirectionLabel } from "./lib/faceAnalysis";

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function App() {
  const {
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
  } = useFaceTracking();

  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = sessionStart ? Date.now() - sessionStart : 0;
  const elapsedMinutes = elapsedMs / 60000;

  const blinksPerMinute = useMemo(() => {
    if (!sessionStart) return 0;
    if (elapsedMinutes < 1) {
      return elapsedMinutes > 0 ? Math.round(blinkCount / elapsedMinutes) : 0;
    }
    const cutoff = Date.now() - 60000;
    const recent = blinkHistory.filter((b) => b.time >= cutoff).length;
    return recent;
  }, [blinkHistory, blinkCount, elapsedMinutes, sessionStart]);

  const avgBlinkDuration = useMemo(() => {
    if (blinkHistory.length === 0) return 0;
    const last = blinkHistory.slice(-10);
    return last.reduce((a, b) => a + b.durationMs, 0) / last.length;
  }, [blinkHistory]);

  const isRunning = status === "running" || status === "no-face";

  const blinkRateNote = useMemo(() => {
    if (!sessionStart || elapsedMs < 8000) return "Gathering data…";
    if (blinksPerMinute < 10) return "Below average — try to blink more, reduce screen strain";
    if (blinksPerMinute > 30) return "Above average — could indicate fatigue or irritation";
    return "Within normal range (10–30/min)";
  }, [blinksPerMinute, sessionStart, elapsedMs]);

  const direction = headDirectionLabel(metrics.yaw, metrics.pitch);

  return (
    <div className="min-h-screen bg-[#07080d] bg-[radial-gradient(ellipse_at_top,_#1b1033_0%,_#07080d_55%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-900/40">
              <span className="text-xl">👁️</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">BlinkLens</h1>
              <p className="text-sm text-slate-400">Real-time blink counter &amp; facial analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={start}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/40 transition hover:brightness-110 active:scale-95"
              >
                {status === "loading-model" || status === "requesting-camera" ? "Starting…" : "Start tracking"}
              </button>
            ) : (
              <button
                onClick={stop}
                className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                Stop
              </button>
            )}
            <button
              onClick={resetStats}
              disabled={!sessionStart}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage} — your browser may be blocking camera access. Please allow permissions and retry.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Camera column */}
          <div className="lg:col-span-7">
            <CameraView videoRef={videoRef} canvasRef={canvasRef} result={latestResult} status={status} />

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Session" value={sessionStart ? formatElapsed(elapsedMs) : "—"} sub="mm:ss" />
              <StatCard label="FPS" value={isRunning ? fps : "—"} sub="frames/sec" />
              <StatCard
                label="Face"
                value={metrics.faceDetected ? "Detected" : "None"}
                sub={metrics.faceDetected ? "Tracking active" : "Looking for face…"}
              />
              <StatCard label="Direction" value={metrics.faceDetected ? direction : "—"} sub="Head orientation" />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Blink activity (last 60s)</h2>
                <span className="text-xs text-slate-500">live buckets · 3s each</span>
              </div>
              <BlinkHistoryChart history={blinkHistory} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-200">Head pose</h2>
                <HeadPoseIndicator yaw={metrics.yaw} pitch={metrics.pitch} roll={metrics.roll} />
              </div>
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-200">Eye Aspect Ratio (EAR)</h2>
                <div className="space-y-3">
                  <MetricBar
                    label="Left eye EAR"
                    value={Math.min(1, metrics.earLeft / 0.4)}
                    suffix={metrics.earLeft.toFixed(3)}
                    colorClass="bg-violet-400"
                  />
                  <MetricBar
                    label="Right eye EAR"
                    value={Math.min(1, metrics.earRight / 0.4)}
                    suffix={metrics.earRight.toFixed(3)}
                    colorClass="bg-cyan-400"
                  />
                  <p className="text-xs text-slate-500">
                    EAR drops sharply toward 0 when an eye closes — a classic computer-vision signal used
                    alongside the AI blendshape model for extra accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Blink counter hero */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-600/20 via-fuchsia-600/10 to-transparent p-6 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-indigo-300">Total blinks</p>
              <p className="my-2 font-mono text-6xl font-bold tabular-nums tracking-tight">{blinkCount}</p>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-300">
                <div>
                  <p className="font-semibold text-white">{blinksPerMinute}</p>
                  <p className="text-xs text-slate-500">blinks / min</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="font-semibold text-white">{avgBlinkDuration ? Math.round(avgBlinkDuration) : "—"}</p>
                  <p className="text-xs text-slate-500">avg duration (ms)</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">{blinkRateNote}</p>
            </div>

            {/* Expression */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Facial expression</h2>
                <ExpressionBadge expression={metrics.expression} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <MetricBar label="Eye openness" value={metrics.eyeOpenness} colorClass="bg-emerald-400" />
                <MetricBar label="Smile" value={metrics.smile} colorClass="bg-amber-400" />
                <MetricBar label="Brow raise" value={metrics.browRaise} colorClass="bg-sky-400" />
                <MetricBar label="Brow furrow" value={metrics.browDown} colorClass="bg-rose-400" />
                <MetricBar label="Jaw / mouth open" value={metrics.jawOpen} colorClass="bg-fuchsia-400" />
                <MetricBar label="Frown" value={metrics.frown} colorClass="bg-blue-400" />
                <MetricBar label="Eye squint" value={metrics.squint} colorClass="bg-cyan-400" />
                <MetricBar label="Cheek puff" value={metrics.cheekPuff} colorClass="bg-lime-400" />
              </div>
            </div>

            {/* Tips / about */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
              <h2 className="mb-2 text-sm font-semibold text-slate-200">How it works</h2>
              <p>
                BlinkLens runs Google's MediaPipe Face Landmarker fully in your browser — no video ever
                leaves your device. It tracks 478 facial landmarks plus 52 expression blendshapes, 30+ times
                per second, to count blinks and analyze eyebrows, mouth, eyes, and head pose in real time.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4">
                <li>Blink detection uses hysteresis on eye-closure confidence to avoid false triggers.</li>
                <li>EAR geometry adds a classic CV cross-check alongside the ML model.</li>
                <li>Head pose is estimated from facial landmark geometry (yaw / pitch / roll).</li>
              </ul>
            </div>
          </div>
        </div>

        <footer className="mt-10 pb-6 text-center text-xs text-slate-600">
          Camera video is processed locally in your browser and is never uploaded anywhere.
        </footer>
      </div>
    </div>
  );
}
