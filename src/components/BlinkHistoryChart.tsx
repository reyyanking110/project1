import { useEffect, useRef } from "react";
import type { BlinkEvent } from "../hooks/useFaceTracking";

interface Props {
  history: BlinkEvent[];
  windowSeconds?: number;
}

/** Draws a simple bucketed bar chart of blink counts over the last N seconds. */
export default function BlinkHistoryChart({ history, windowSeconds = 60 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const buckets = 20;
    const bucketMs = (windowSeconds * 1000) / buckets;
    const now = Date.now();
    const counts = new Array(buckets).fill(0);

    for (const ev of history) {
      const age = now - ev.time;
      if (age < 0 || age > windowSeconds * 1000) continue;
      const idx = buckets - 1 - Math.floor(age / bucketMs);
      if (idx >= 0 && idx < buckets) counts[idx] += 1;
    }

    const max = Math.max(1, ...counts);
    const gap = 3;
    const barW = (w - gap * (buckets - 1)) / buckets;

    counts.forEach((c, i) => {
      const barH = (c / max) * (h - 4);
      const x = i * (barW + gap);
      const y = h - barH;
      const grad = ctx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, "#818cf8");
      grad.addColorStop(1, "#4f46e5");
      ctx.fillStyle = c > 0 ? grad : "rgba(255,255,255,0.06)";
      ctx.fillRect(x, c > 0 ? y : h - 2, barW, c > 0 ? barH : 2);
    });
  }, [history, windowSeconds]);

  return (
    <div className="h-20 w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
