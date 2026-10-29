import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deviceReadingsSince, parseMinutes } from "@/lib/deviceReadings";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** `?minutes=10` (1–1440): readings of the last N minutes, oldest first. */
export const GET = route(async (request: NextRequest) => {
  const minutes = parseMinutes(request.nextUrl.searchParams, 10);
  const db = await getDb();
  return NextResponse.json(await deviceReadingsSince(db, Date.now() - minutes * 60_000));
});
