type Tone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "neutral"
  // LEGACY tone names, remove in Tahap 4.
  | "accent"
  | "good"
  | "warn"
  | "critical"
  | "sim";

const TONE_CLASS: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger/10 text-danger",
  info: "bg-info-soft text-info-text",
  purple: "bg-purple-soft text-purple-text",
  neutral: "bg-surface-muted text-ink-secondary",
  accent: "bg-primary-soft text-primary",
  good: "bg-success-soft text-success-text",
  warn: "bg-warning-soft text-warning-text",
  critical: "bg-danger/10 text-danger",
  sim: "bg-purple-soft text-purple-text",
};

export function StatusPill({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold md:text-xs ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
