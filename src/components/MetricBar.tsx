import { cn } from "../utils/cn";

interface Props {
  label: string;
  value: number; // 0..1
  colorClass?: string;
  suffix?: string;
}

export default function MetricBar({ label, value, colorClass = "bg-indigo-400", suffix }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-300">{suffix ?? `${pct}%`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={cn("h-full rounded-full transition-all duration-150 ease-out", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
