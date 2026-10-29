import type { Row } from "@libsql/client";
import type { DeviceStatus, ScheduleSlot, Settings } from "./types";
import { numOrNull, str, strOrNull } from "./db";
import { DEVICE_OFFLINE_AFTER_MS } from "./deviceState";
import { lampsOn } from "./prayer";

export const DEVICE_STATUS_SQL = "SELECT device_id, last_seen, rssi, fw FROM device_status ORDER BY last_seen DESC LIMIT 1";

export function toDeviceStatus(r: Row | undefined, nowMs: number): DeviceStatus | null {
  if (!r) return null;
  const lastSeen = str(r.last_seen);
  return {
    device_id: str(r.device_id),
    last_seen: lastSeen,
    rssi: numOrNull(r.rssi),
    fw: strOrNull(r.fw),
    online: nowMs - Date.parse(lastSeen) <= DEVICE_OFFLINE_AFTER_MS,
  };
}

/** What the ESP32 receives after every POST /api/ingest and from GET /api/device/config. */
export function buildDeviceConfig(settings: Settings, slots: readonly ScheduleSlot[]) {
  return {
    reserve_min: settings.reserve_min,
    max_brightness: settings.max_brightness,
    zone1_enabled: settings.zone1_enabled,
    zone2_enabled: settings.zone2_enabled,
    auto_dim: settings.auto_dim,
    deep_sleep: settings.deep_sleep,
    adzan: settings.adzan,
    schedule: slots.map((s) => ({
      prayer: s.prayer,
      time: s.time,
      priority: s.priority,
      lamps: lampsOn(s),
      lamp_pct: lampsOn(s) ? Math.min(s.lamp_pct, settings.max_brightness) : 0,
      target_min: s.target_min,
    })),
  };
}
