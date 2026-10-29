import { NextRequest, NextResponse } from "next/server";
import { deviceKeyMatches } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildDeviceConfig } from "@/lib/device";
import { insertDeviceReading, parseDeviceReading } from "@/lib/deviceReadings";
import { HttpError, readBody, route } from "@/lib/http";
import { ingestReading, parseIngest } from "@/lib/ingest";
import { getActiveSchedule } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** The full payload (firmware/esp32_contoh) carries battery and PLN data too. */
function isFullPayload(body: Record<string, unknown>): boolean {
  return "bat_voltage" in body || "bat_percent" in body || "pln_on" in body;
}

/**
 * The ESP32 posts here every few seconds. A generator-only payload is stored in
 * `device_readings` for the Uji Generator page; a full payload also updates
 * battery, blackouts and test sessions and gets the device settings back.
 */
export const POST = route(async (request: NextRequest) => {
  if (!deviceKeyMatches(request)) {
    if (!process.env.DEVICE_API_KEY) console.warn("DEVICE_API_KEY belum diatur di .env.local");
    throw new HttpError(401, "Kunci API salah");
  }
  const now = Date.now();
  const body = await readBody(request);
  const db = await getDb();

  if (!isFullPayload(body)) {
    const id = await insertDeviceReading(db, parseDeviceReading(body), now);
    return NextResponse.json({ ok: true, id });
  }

  const payload = parseIngest(body, now);
  const [settings, schedule] = await Promise.all([getSettings(db), getActiveSchedule(db)]);
  await ingestReading(db, payload, now, settings, schedule.slots);
  // Backfilled readings (with `ts`) are history, not live generator data.
  const id =
    payload.tsMs === null
      ? await insertDeviceReading(
          db,
          { device_id: payload.device_id, gen_voltage: payload.gen_voltage, gen_current: payload.gen_current ?? 0, rssi: payload.rssi },
          now
        )
      : null;

  return NextResponse.json({ ok: true, id, ...buildDeviceConfig(settings, schedule.slots) });
});
