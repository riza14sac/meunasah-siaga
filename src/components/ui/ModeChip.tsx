import type { Mode } from "@/lib/types";

/** Always-visible label of where the numbers come from (switching lives in Atur). */
export function ModeChip({ mode }: { mode: Mode | undefined }) {
  if (!mode) return <span className="h-8 w-28 shrink-0 rounded-full bg-surface-muted" aria-hidden="true" />;
  const real = mode === "real";
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink">
      <span className={`h-2 w-2 rounded-full ${real ? "bg-success" : "bg-warning"}`} aria-hidden="true" />
      {real ? "Mode Real" : "Mode Simulasi"}
    </span>
  );
}
