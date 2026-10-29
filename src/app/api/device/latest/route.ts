import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { GENERATOR_ONLINE_WINDOW_MS } from "@/lib/deviceState";
import { latestDeviceReading } from "@/lib/deviceReadings";
import { route } from "@/lib/http";
import type { DeviceLatestResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const reading = await latestDeviceReading(db);
  const now = Date.now();
  const body: DeviceLatestResponse = {
    reading,
    online: reading !== null && now - Date.parse(reading.ts) < GENERATOR_ONLINE_WINDOW_MS,
    last_seen: reading?.ts ?? null,
    server_time: new Date(now).toISOString(),
  };
  return NextResponse.json(body);
});
