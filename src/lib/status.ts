import type { Client } from "@libsql/client";
import type { StatusResponse } from "./types";
import { num } from "./db";
import { BLACKOUT_COLS, toBlackout } from "./blackouts";
import { DEVICE_STATUS_SQL, toDeviceStatus } from "./device";
import { chargePowerW, turbinePowerW } from "./energy";
import { lampsOn, nextPrayer } from "./prayer";
import { READING_COLS, toReading } from "./readings";
import { ACTIVE_PROFILE_SQL, ACTIVE_SLOTS_SQL, toActiveSchedule } from "./schedule";
import { SETTINGS_SQL, toSettings } from "./settings";
import { wibDayStart } from "./time";

const CURRENT_MODE = "(SELECT mode FROM system_settings WHERE id = 1)";

/** Everything the live screens need, in a single round trip to the database. */
export async function getStatus(db: Client, nowMs: number): Promise<StatusResponse> {
  const dayStartIso = new Date(wibDayStart(nowMs)).toISOString();
  const [settingsRes, readingRes, deviceRes, blackoutRes, energyRes, countRes, profileRes, slotsRes] = await db.batch(
    [
      SETTINGS_SQL,
      `SELECT ${READING_COLS} FROM readings WHERE mode = ${CURRENT_MODE} ORDER BY ts DESC LIMIT 1`,
      DEVICE_STATUS_SQL,
      `SELECT ${BLACKOUT_COLS} FROM blackout_events
       WHERE mode = ${CURRENT_MODE} AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
      {
        sql: `SELECT COALESCE(SUM(energy_in_wh), 0) AS e_in, COALESCE(SUM(energy_out_wh), 0) AS e_out
              FROM stats_5min WHERE mode = ${CURRENT_MODE} AND bucket >= ?`,
        args: [dayStartIso],
      },
      {
        sql: `SELECT COUNT(*) AS c FROM blackout_events WHERE mode = ${CURRENT_MODE} AND start_time >= ?`,
        args: [dayStartIso],
      },
      ACTIVE_PROFILE_SQL,
      ACTIVE_SLOTS_SQL,
    ],
    "read"
  );

  const settings = toSettings(settingsRes.rows[0]);
  const reading = readingRes.rows[0] ? toReading(readingRes.rows[0]) : null;
  const schedule = toActiveSchedule(profileRes, slotsRes);
  const next = nextPrayer(nowMs, schedule.slots);

  return {
    mode: settings.mode,
    server_time: new Date(nowMs).toISOString(),
    device: toDeviceStatus(deviceRes.rows[0], nowMs),
    reading,
    charge_power_w: reading ? chargePowerW(reading) : null,
    turbine_power_w: reading ? turbinePowerW(reading) : null,
    active_blackout: blackoutRes.rows[0] ? toBlackout(blackoutRes.rows[0]) : null,
    next_prayer: next
      ? {
          prayer: next.slot.prayer,
          at: new Date(next.atMs).toISOString(),
          priority: next.slot.priority,
          lamp_pct: next.slot.lamp_pct,
          lamps: lampsOn(next.slot),
        }
      : null,
    today: {
      energy_in_wh: num(energyRes.rows[0].e_in),
      energy_out_wh: num(energyRes.rows[0].e_out),
      blackout_count: num(countRes.rows[0].c),
    },
    settings,
    schedule: { profile_name: schedule.name, slots: schedule.slots },
  };
}
