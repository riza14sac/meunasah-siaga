import type { StatusResponse } from "./types";

/** No data for longer than this and the dashboard shows "ESP32 terputus". */
export const DEVICE_OFFLINE_AFTER_MS = 30_000;

/** Uji Generator: the ESP32 sends every 2 s, so 10 s of silence means "Terputus". */
export const GENERATOR_ONLINE_WINDOW_MS = 10_000;

export interface DeviceConnection {
  state: "online" | "offline" | "never";
  lastSeen: string | null;
  /** How long ago the device last sent data, measured on the server's clock. */
  ageMs: number;
}

/**
 * Re-evaluates the 30-second rule between polls. The age is measured against
 * the server's clock (server_time plus the time since the response arrived),
 * so a phone with a wrong clock still shows the right state.
 */
export function deviceConnection(status: StatusResponse | null, receivedAt: number | null, nowMs: number): DeviceConnection {
  const device = status?.device;
  if (!status || !device) return { state: "never", lastSeen: null, ageMs: 0 };
  const serverNow = Date.parse(status.server_time) + (receivedAt === null ? 0 : nowMs - receivedAt);
  const ageMs = Math.max(0, serverNow - Date.parse(device.last_seen));
  return { state: ageMs <= DEVICE_OFFLINE_AFTER_MS ? "online" : "offline", lastSeen: device.last_seen, ageMs };
}
