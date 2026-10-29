const RANGE_PATTERN = /^(\d+)(m|h|d)$/;
const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const DEFAULT_MS = 24 * UNIT_MS.h;
const MAX_MS = 31 * UNIT_MS.d;

/** Parses "60m", "24h" or "7d" into milliseconds (1 minute to 31 days). Falls back to 24h. */
export function parseRangeMs(range: string | null): number {
  const match = range ? RANGE_PATTERN.exec(range) : null;
  if (!match) return DEFAULT_MS;
  const ms = Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
  return Math.min(MAX_MS, Math.max(UNIT_MS.m, ms));
}
