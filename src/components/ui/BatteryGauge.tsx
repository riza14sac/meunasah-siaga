"use client";

const SIZE = 168;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function BatteryGauge({ percent, reservePercent }: { percent: number; reservePercent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const toneClass = clamped <= 0 ? "stroke-danger" : clamped <= reservePercent ? "stroke-warning" : "stroke-primary";
  const offset = CIRC * (1 - clamped / 100);
  const reserveAngle = (reservePercent / 100) * 360 - 90;

  return (
    <div className="relative flex h-[168px] w-[168px] shrink-0 items-center justify-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-primary-soft" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          className={toneClass}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        className="absolute h-1.5 w-1.5 rounded-full bg-ink-muted"
        style={{
          transform: `rotate(${reserveAngle}deg) translate(${R}px) rotate(${-reserveAngle}deg)`,
          top: "50%",
          left: "50%",
          marginTop: "-3px",
          marginLeft: "-3px",
        }}
        title={`Cadangan minimum ${reservePercent}%`}
      />
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums text-ink">{clamped.toFixed(0)}%</span>
        <span className="text-xs text-ink-secondary">Baterai</span>
      </div>
    </div>
  );
}
