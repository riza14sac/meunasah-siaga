// WIB (Asia/Jakarta) has no daylight saving time, so a fixed +07:00 offset is
// exact. Using it everywhere keeps the server (UTC on Vercel) and the browser
// in agreement about what "today" and "18:32" mean.
export const TIME_ZONE = "Asia/Jakarta";
export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
const WIB_OFFSET_MS = 7 * HOUR_MS;

/** Epoch ms of 00:00 WIB on the WIB calendar day containing `ms`. */
export function wibDayStart(ms: number): number {
  return Math.floor((ms + WIB_OFFSET_MS) / DAY_MS) * DAY_MS - WIB_OFFSET_MS;
}

/** "YYYY-MM-DD" of the WIB calendar day containing `ms`. */
export function wibDateKey(ms: number): string {
  return new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Epoch ms of 00:00 WIB for a "YYYY-MM-DD" key. */
export function wibDayStartFromKey(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00+07:00`);
}

/** Epoch ms of "HH:MM" WIB on the day that starts at `dayStartMs`. */
export function atWibTime(dayStartMs: number, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return dayStartMs + h * HOUR_MS + m * MINUTE_MS;
}

/** "HH:MM" in WIB. */
export function wibClock(ms: number): string {
  return new Date(ms + WIB_OFFSET_MS).toISOString().slice(11, 16);
}

/** "HH:MM:SS" in WIB. */
export function wibClockSeconds(ms: number): string {
  return new Date(ms + WIB_OFFSET_MS).toISOString().slice(11, 19);
}
