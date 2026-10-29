import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import { getSettings, parseSettingsPatch, updateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const GET = route(async () => NextResponse.json(await getSettings(await getDb())));

export const PATCH = route(async (request: NextRequest) => {
  requireAdmin(request);
  const patch = parseSettingsPatch(await readBody(request));
  return NextResponse.json(await updateSettings(await getDb(), patch));
});
