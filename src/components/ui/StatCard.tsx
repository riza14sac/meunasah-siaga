import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { Sparkline } from "./Sparkline";

type Tone = "accent" | "good" | "warn" | "critical";

const TONE_BG: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  good: "bg-good-soft text-good-text",
  warn: "bg-warn-soft text-warn-text",
  critical: "bg-critical-soft text-critical-text",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  tone = "accent",
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: Tone;
  trend?: number[];
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_BG[tone]}`}>
          <Icon size={18} strokeWidth={1.5} />
        </span>
        {trend && trend.length > 1 && <Sparkline values={trend} color={tone} />}
      </div>
      <div>
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[1.75rem] font-semibold leading-none text-ink">{value}</span>
          {unit && <span className="text-sm font-medium text-ink-faint">{unit}</span>}
        </p>
        {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
      </div>
    </Card>
  );
}
