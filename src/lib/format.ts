import { TIME_ZONE, wibClock, wibClockSeconds } from "./time";

type DateInput = string | number;

const toMs = (value: DateInput) => (typeof value === "number" ? value : Date.parse(value));

const dateShort = new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const dateLong = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "18:47" (WIB). Figma uses a colon, which id-ID's own time format does not. */
export function formatClock(value: DateInput): string {
  return wibClock(toMs(value));
}

/** "18:47:05" (WIB). */
export function formatClockSeconds(value: DateInput): string {
  return wibClockSeconds(toMs(value));
}

/** "27 Sep" (WIB). */
export function formatDateShort(value: DateInput): string {
  return dateShort.format(toMs(value));
}

/** "Sab, 24 Okt 2026" (WIB). */
export function formatDateLong(value: DateInput): string {
  return dateLong.format(toMs(value));
}

/** "27 Sep · 18:47" (WIB). */
export function formatDateTime(value: DateInput): string {
  return `${formatDateShort(value)} · ${formatClock(value)}`;
}

export function formatRelative(value: DateInput, nowMs: number = Date.now()): string {
  return formatAgo(nowMs - toMs(value));
}

/** "12 detik lalu" for an age in milliseconds. */
export function formatAgo(ageMs: number): string {
  const diffSec = Math.round(ageMs / 1000);
  if (diffSec < 5) return "baru saja";
  if (diffSec < 60) return `${diffSec} detik lalu`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return `${Math.round(diffHour / 24)} hari lalu`;
}

export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} j` : `${h} j ${m} mnt`;
}

/** Duration between two instants; an open-ended span runs until now. */
export function formatDuration(start: DateInput, end: DateInput | null, nowMs: number = Date.now()): string {
  const endMs = end === null ? nowMs : toMs(end);
  return formatMinutes((endMs - toMs(start)) / 60_000);
}

const numberFormats = new Map<number, Intl.NumberFormat>();

/** Indonesian decimal comma: 11,8. */
export function formatNumber(value: number, maxDigits = 1): string {
  let fmt = numberFormats.get(maxDigits);
  if (!fmt) {
    fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: maxDigits });
    numberFormats.set(maxDigits, fmt);
  }
  return fmt.format(value);
}
