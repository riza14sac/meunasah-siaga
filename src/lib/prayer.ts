import type { PrayerKey, Priority, ScheduleSlot } from "./types";
import { atWibTime, DAY_MS, MINUTE_MS, wibDayStart } from "./time";

export const PRAYER_KEYS: readonly PrayerKey[] = ["subuh", "zuhur", "ashar", "maghrib", "isya"];
export const PRIORITIES: readonly Priority[] = ["rendah", "sedang", "tinggi"];

const LABELS: Record<PrayerKey, string> = {
  subuh: "Subuh",
  zuhur: "Zuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

const SHORT_LABELS: Record<PrayerKey, string> = {
  subuh: "SBH",
  zuhur: "ZHR",
  ashar: "ASR",
  maghrib: "MGR",
  isya: "ISY",
};

export const PRIORITY_LABELS: Record<Priority, string> = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" };

export function prayerLabel(key: PrayerKey): string {
  return LABELS[key];
}

export function prayerShortLabel(key: PrayerKey): string {
  return SHORT_LABELS[key];
}

/** Zuhur and Ashar fall in daylight: the firmware never lights the lamps for them. */
export function isDaylightPrayer(key: PrayerKey): boolean {
  return key === "zuhur" || key === "ashar";
}

export function lampsOn(slot: ScheduleSlot): boolean {
  return !isDaylightPrayer(slot.prayer) && slot.lamp_pct > 0;
}

export const DEFAULT_PROFILE_ID = "standar-kemenag";
export const DEFAULT_PROFILE_NAME = "Standar Kemenag";
export const DEFAULT_SLOTS: readonly ScheduleSlot[] = [
  { prayer: "subuh", time: "04:52", priority: "sedang", lamp_pct: 40, target_min: 30 },
  { prayer: "zuhur", time: "12:24", priority: "rendah", lamp_pct: 0, target_min: 0 },
  { prayer: "ashar", time: "15:37", priority: "rendah", lamp_pct: 0, target_min: 0 },
  { prayer: "maghrib", time: "18:32", priority: "tinggi", lamp_pct: 80, target_min: 25 },
  { prayer: "isya", time: "19:45", priority: "tinggi", lamp_pct: 80, target_min: 30 },
];

export function slotOf(slots: readonly ScheduleSlot[], key: PrayerKey): ScheduleSlot {
  return slots.find((s) => s.prayer === key) ?? DEFAULT_SLOTS.find((s) => s.prayer === key)!;
}

export function nextPrayer(nowMs: number, slots: readonly ScheduleSlot[]): { slot: ScheduleSlot; atMs: number } | null {
  const today = wibDayStart(nowMs);
  for (const day of [today, today + DAY_MS]) {
    const upcoming = slots
      .map((slot) => ({ slot, atMs: atWibTime(day, slot.time) }))
      .filter((p) => p.atMs >= nowMs)
      .sort((a, b) => a.atMs - b.atMs);
    if (upcoming.length > 0) return upcoming[0];
  }
  return null;
}

/** Lamps come on a little before the prayer so jamaah arriving early have light. */
const LEAD_MIN = 15;
/** Dimmed level between Maghrib and Isya ("Jeda" in the Darurat screen). */
const JEDA_PCT = 35;

export interface LampPeriod {
  /** For a "jeda" period this is the prayer it leads into. */
  prayer: PrayerKey;
  kind: "shalat" | "jeda";
  startMs: number;
  endMs: number;
  pct: number;
}

/** Planned lamp periods during a blackout on the WIB day starting at `dayStartMs`. */
export function lampPeriods(dayStartMs: number, slots: readonly ScheduleSlot[], maxBrightness: number): LampPeriod[] {
  const windowFor = (key: PrayerKey): LampPeriod | null => {
    const slot = slotOf(slots, key);
    if (!lampsOn(slot)) return null;
    const at = atWibTime(dayStartMs, slot.time);
    return {
      prayer: key,
      kind: "shalat",
      startMs: at - LEAD_MIN * MINUTE_MS,
      endMs: at + slot.target_min * MINUTE_MS,
      pct: Math.min(slot.lamp_pct, maxBrightness),
    };
  };

  const subuh = windowFor("subuh");
  const maghrib = windowFor("maghrib");
  const isya = windowFor("isya");

  const periods: LampPeriod[] = [];
  if (subuh) periods.push(subuh);
  if (maghrib) periods.push(maghrib);
  if (maghrib && isya && isya.startMs > maghrib.endMs) {
    periods.push({
      prayer: "isya",
      kind: "jeda",
      startMs: maghrib.endMs,
      endMs: isya.startMs,
      pct: Math.min(JEDA_PCT, maxBrightness),
    });
  }
  if (isya) periods.push(isya);
  return periods;
}

/** [Subuh selesai, Maghrib) on the given WIB day: daylight, lamps stay off. */
export function daylightSpan(dayStartMs: number, slots: readonly ScheduleSlot[]): [number, number] {
  const subuh = slotOf(slots, "subuh");
  const maghrib = slotOf(slots, "maghrib");
  return [
    atWibTime(dayStartMs, subuh.time) + subuh.target_min * MINUTE_MS,
    atWibTime(dayStartMs, maghrib.time),
  ];
}
