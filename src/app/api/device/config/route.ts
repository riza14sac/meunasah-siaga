import { NextRequest, NextResponse } from "next/server";
import { requireDeviceKey } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildDeviceConfig } from "@/lib/device";
import { route } from "@/lib/http";
import { getActiveSchedule } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const GET = route(async (request: NextRequest) => {
  requireDeviceKey(request);
  const db = await getDb();
  const [settings, schedule] = await Promise.all([getSettings(db), getActiveSchedule(db)]);
  return NextResponse.json(buildDeviceConfig(settings, schedule.slots));
});
