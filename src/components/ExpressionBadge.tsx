import type { Expression } from "../lib/faceAnalysis";

const STYLES: Record<Expression, string> = {
  Happy: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  Surprised: "bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30",
  Angry: "bg-red-400/15 text-red-300 border-red-400/30",
  Sad: "bg-blue-400/15 text-blue-300 border-blue-400/30",
  Sleepy: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  Focused: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  Neutral: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
};

const EMOJI: Record<Expression, string> = {
  Happy: "😄",
  Surprised: "😲",
  Angry: "😠",
  Sad: "😔",
  Sleepy: "😴",
  Focused: "🧐",
  Neutral: "🙂",
};

export default function ExpressionBadge({ expression }: { expression: Expression }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${STYLES[expression]}`}
    >
      <span className="text-base">{EMOJI[expression]}</span>
      {expression}
    </span>
  );
}
