// Battery: Li-Po 1S 3,7 V 3500 mAh.
export const BATTERY_NOMINAL_V = 3.7;
export const BATTERY_CAPACITY_AH = 3.5;
export const LAMP_W = 2;
export const ESP32_W = 0.5;

/** The turbine counts as spinning above this generator voltage. */
export const SPIN_THRESHOLD_V = 2;
/** Consecutive readings further apart than this are a gap, not a slope to integrate. */
const MAX_GAP_S = 300;
export const BUCKET_MS = 5 * 60_000;

export interface PowerSample {
  tsMs: number;
  gen_voltage: number;
  bat_voltage: number;
  bat_current: number;
}

/** Power flowing into the battery: V × max(0, −I), since a negative current means charging. */
export function chargePowerW(r: { bat_voltage: number; bat_current: number }): number {
  return r.bat_voltage * Math.max(0, -r.bat_current);
}

/** Power drawn from the battery by the lamps and the ESP32. */
export function dischargePowerW(r: { bat_voltage: number; bat_current: number }): number {
  return r.bat_voltage * Math.max(0, r.bat_current);
}

/** Only known once the second INA219 on the generator output is installed. */
export function turbinePowerW(r: { gen_voltage: number; gen_current: number | null }): number | null {
  return r.gen_current === null ? null : r.gen_voltage * r.gen_current;
}

export interface RollupDelta {
  energy_in_wh: number;
  energy_out_wh: number;
  spin_seconds: number;
}

/** Trapezoid integration of the step from `prev` to `cur`. */
export function rollupDelta(prev: PowerSample | null, cur: PowerSample): RollupDelta {
  const dt = prev ? (cur.tsMs - prev.tsMs) / 1000 : 0;
  if (!prev || dt <= 0 || dt > MAX_GAP_S) return { energy_in_wh: 0, energy_out_wh: 0, spin_seconds: 0 };
  return {
    energy_in_wh: (((chargePowerW(prev) + chargePowerW(cur)) / 2) * dt) / 3600,
    energy_out_wh: (((dischargePowerW(prev) + dischargePowerW(cur)) / 2) * dt) / 3600,
    spin_seconds: cur.gen_voltage > SPIN_THRESHOLD_V ? dt : 0,
  };
}

export function bucketStartMs(ms: number): number {
  return Math.floor(ms / BUCKET_MS) * BUCKET_MS;
}
