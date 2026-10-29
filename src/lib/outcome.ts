import type { BlackoutOutcome, ScheduleSlot } from "./types";
import { daylightSpan, lampPeriods, prayerLabel, type LampPeriod } from "./prayer";
import { DAY_MS, wibClock, wibDayStart } from "./time";

export interface OutcomeSample {
  tsMs: number;
  bat_percent: number;
  lamp1_pct: number;
  lamp2_pct: number;
}

export interface Outcome {
  outcome: BlackoutOutcome;
  fail_reason: string | null;
  note: string;
}

const EMPTY_PCT = 1;
/** A device that goes silent at or below this charge most likely browned out. */
const LOW_PCT = 5;
const SILENCE_MS = 120_000;
/** The firmware needs a moment to debounce PLN and ramp the lamps up. */
const GRACE_MS = 60_000;

/**
 * Decides how a closed blackout went. Lamps are only judged inside the planned
 * lamp periods (Subuh, Maghrib, Jeda, Isya); a blackout entirely in daylight
 * is "siang" because the lamps are deliberately left off.
 */
export function classifyBlackout(input: {
  startMs: number;
  endMs: number;
  samples: OutcomeSample[];
  slots: readonly ScheduleSlot[];
  maxBrightness: number;
  zonesEnabled: boolean;
}): Outcome {
  const { startMs, endMs, slots } = input;

  const periods: LampPeriod[] = [];
  for (let day = wibDayStart(startMs) - DAY_MS; day <= wibDayStart(endMs); day += DAY_MS) {
    periods.push(...lampPeriods(day, slots, input.maxBrightness));
  }
  const overlapping = periods.filter((p) => p.startMs < endMs && p.endMs > startMs);

  if (overlapping.length === 0) {
    const [dayStart, dayEnd] = daylightSpan(wibDayStart(startMs), slots);
    return startMs >= dayStart && endMs <= dayEnd
      ? { outcome: "siang", fail_reason: null, note: "Siang hari, lampu tidak dinyalakan" }
      : { outcome: "bertahan", fail_reason: null, note: "Di luar waktu shalat, lampu siaga sampai PLN pulih" };
  }

  const samples = input.samples.filter((s) => s.tsMs >= startMs && s.tsMs <= endMs).sort((a, b) => a.tsMs - b.tsMs);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    // The closing sample is taken after PLN came back, when the lamps are off on purpose.
    if (s.tsMs >= endMs) continue;
    const period = overlapping.find((p) => s.tsMs >= p.startMs && s.tsMs < p.endMs);
    if (!period) continue;

    const silentFor = (samples[i + 1]?.tsMs ?? endMs) - s.tsMs;
    const empty = s.bat_percent <= EMPTY_PCT || (s.bat_percent <= LOW_PCT && silentFor > SILENCE_MS);
    const dark =
      input.zonesEnabled && s.lamp1_pct + s.lamp2_pct === 0 && s.tsMs - Math.max(startMs, period.startMs) > GRACE_MS;

    if (empty || dark) {
      const reason = `${empty ? "Baterai habis" : "Lampu padam"} ${wibClock(s.tsMs)}, sebelum ${prayerLabel(period.prayer)} selesai`;
      return { outcome: "gagal", fail_reason: reason, note: reason };
    }
  }

  const last = overlapping[overlapping.length - 1];
  return { outcome: "bertahan", fail_reason: null, note: `Lampu menyala sampai ${prayerLabel(last.prayer)} selesai` };
}
