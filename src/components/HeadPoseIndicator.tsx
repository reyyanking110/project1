interface Props {
  yaw: number;
  pitch: number;
  roll: number;
}

export default function HeadPoseIndicator({ yaw, pitch, roll }: Props) {
  const clampedYaw = Math.max(-30, Math.min(30, yaw));
  const clampedPitch = Math.max(-30, Math.min(30, pitch));
  const dotX = 50 + (clampedYaw / 30) * 40;
  const dotY = 50 + (clampedPitch / 30) * 40;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 bg-white/5" />
        <div className="absolute left-1/2 top-1/2 h-px w-full -translate-y-1/2 bg-white/5" />
        <div
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]"
          style={{ left: `${dotX}%`, top: `${dotY}%` }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 font-mono text-xs text-slate-400">
        <div className="flex justify-between">
          <span>Yaw</span>
          <span className="text-slate-200">{yaw.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between">
          <span>Pitch</span>
          <span className="text-slate-200">{pitch.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between">
          <span>Roll</span>
          <span className="text-slate-200">{roll.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
}
