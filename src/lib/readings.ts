import type { Client, InStatement, Row } from "@libsql/client";
import type { Mode, Reading, ReadingPoint } from "./types";
import { bool, num, numOrNull, str, strOrNull } from "./db";
import { bucketStartMs, chargePowerW, type RollupDelta } from "./energy";
import { HOUR_MS } from "./time";

export const READING_COLS = `id, ts, mode, device_id, gen_voltage, gen_current, bat_voltage, bat_current,
  bat_percent, pln_on, lamp1_pct, lamp2_pct, rssi, fw`;

export function toReading(r: Row): Reading {
  return {
    id: num(r.id),
    ts: str(r.ts),
    mode: str(r.mode) === "simulasi" ? "simulasi" : "real",
    device_id: strOrNull(r.device_id),
    gen_voltage: num(r.gen_voltage),
    gen_current: numOrNull(r.gen_current),
    bat_voltage: num(r.bat_voltage),
    bat_current: num(r.bat_current),
    bat_percent: num(r.bat_percent),
    pln_on: bool(r.pln_on),
    lamp1_pct: num(r.lamp1_pct),
    lamp2_pct: num(r.lamp2_pct),
    rssi: numOrNull(r.rssi),
    fw: strOrNull(r.fw),
  };
}

/** Folds one reading into its 5-minute bucket in stats_5min. */
export function rollupStatement(mode: Mode, tsMs: number, batPercent: number, genVoltage: number, d: RollupDelta): InStatement {
  return {
    sql: `INSERT INTO stats_5min (mode, bucket, samples, bat_pct_sum, bat_pct_last, gen_v_max, energy_in_wh, energy_out_wh, spin_seconds)
          VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (mode, bucket) DO UPDATE SET
            samples = samples + 1,
            bat_pct_sum = bat_pct_sum + excluded.bat_pct_sum,
            bat_pct_last = excluded.bat_pct_last,
            gen_v_max = MAX(gen_v_max, excluded.gen_v_max),
            energy_in_wh = energy_in_wh + excluded.energy_in_wh,
            energy_out_wh = energy_out_wh + excluded.energy_out_wh,
            spin_seconds = spin_seconds + excluded.spin_seconds`,
    args: [
      mode,
      new Date(bucketStartMs(tsMs)).toISOString(),
      batPercent,
      batPercent,
      genVoltage,
      d.energy_in_wh,
      d.energy_out_wh,
      d.spin_seconds,
    ],
  };
}

/** Raw readings for short ranges, 5-minute buckets for anything longer than two hours. */
export async function getReadingPoints(db: Client, mode: Mode, sinceMs: number, rangeMs: number): Promise<ReadingPoint[]> {
  const sinceIso = new Date(sinceMs).toISOString();

  if (rangeMs <= 2 * HOUR_MS) {
    const res = await db.execute({
      sql: `SELECT ts, bat_percent, gen_voltage, bat_voltage, bat_current FROM readings
            WHERE mode = ? AND ts >= ? ORDER BY ts`,
      args: [mode, sinceIso],
    });
    return res.rows.map((r) => ({
      ts: str(r.ts),
      bat_percent: num(r.bat_percent),
      gen_voltage: num(r.gen_voltage),
      charge_w: chargePowerW({ bat_voltage: num(r.bat_voltage), bat_current: num(r.bat_current) }),
    }));
  }

  const res = await db.execute({
    sql: `SELECT bucket, bat_pct_sum / samples AS bat, gen_v_max, energy_in_wh FROM stats_5min
          WHERE mode = ? AND bucket >= ? AND samples > 0 ORDER BY bucket`,
    args: [mode, sinceIso],
  });
  return res.rows.map((r) => ({
    ts: str(r.bucket),
    bat_percent: num(r.bat),
    gen_voltage: num(r.gen_v_max),
    // Wh collected in a 5-minute bucket → average watts over that bucket.
    charge_w: num(r.energy_in_wh) * 12,
  }));
}
