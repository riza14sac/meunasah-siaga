import type { Client, Row } from "@libsql/client";
import type { Settings } from "./types";
import { bool, num, str } from "./db";
import { ValidationError } from "./http";
import { optionalBooleanField, optionalNumberField, type Body } from "./validate";

export const SETTINGS_SQL = `SELECT mode, reserve_min, max_brightness, zone1_enabled, zone2_enabled,
  auto_dim, notify, deep_sleep, adzan FROM system_settings WHERE id = 1`;

const FLAGS = ["zone1_enabled", "zone2_enabled", "auto_dim", "notify", "deep_sleep", "adzan"] as const;

export function toSettings(r: Row): Settings {
  return {
    mode: str(r.mode) === "simulasi" ? "simulasi" : "real",
    reserve_min: num(r.reserve_min),
    max_brightness: num(r.max_brightness),
    zone1_enabled: bool(r.zone1_enabled),
    zone2_enabled: bool(r.zone2_enabled),
    auto_dim: bool(r.auto_dim),
    notify: bool(r.notify),
    deep_sleep: bool(r.deep_sleep),
    adzan: bool(r.adzan),
  };
}

export async function getSettings(db: Client): Promise<Settings> {
  const res = await db.execute(SETTINGS_SQL);
  return toSettings(res.rows[0]);
}

export function parseSettingsPatch(body: Body): Partial<Settings> {
  const patch: Partial<Settings> = {};

  if (body.mode !== undefined) {
    if (body.mode !== "real" && body.mode !== "simulasi") throw new ValidationError("Mode harus 'real' atau 'simulasi'");
    patch.mode = body.mode;
  }
  const reserve = optionalNumberField(body, "reserve_min", { min: 0, max: 50, integer: true, label: "Cadangan minimum", unit: "%" });
  if (reserve !== undefined) patch.reserve_min = reserve;
  const brightness = optionalNumberField(body, "max_brightness", {
    min: 0,
    max: 80,
    integer: true,
    label: "Kecerahan maksimum",
    unit: "%",
  });
  if (brightness !== undefined) patch.max_brightness = brightness;
  for (const key of FLAGS) {
    const value = optionalBooleanField(body, key);
    if (value !== undefined) patch[key] = value;
  }

  if (Object.keys(patch).length === 0) throw new ValidationError("Tidak ada pengaturan yang diubah");
  return patch;
}

export async function updateSettings(db: Client, patch: Partial<Settings>): Promise<Settings> {
  // Keys come from parseSettingsPatch, so they are known column names.
  const entries = Object.entries(patch);
  await db.execute({
    sql: `UPDATE system_settings SET ${entries.map(([key]) => `${key} = ?`).join(", ")} WHERE id = 1`,
    args: entries.map(([, value]) => (typeof value === "boolean" ? (value ? 1 : 0) : value)),
  });
  return getSettings(db);
}
