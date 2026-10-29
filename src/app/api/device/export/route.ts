import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { deviceCsvFilename, deviceReadingsCsv, deviceReadingsSince, parseMinutes } from "@/lib/deviceReadings";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** `?minutes=60`: CSV of the last N minutes for Excel. */
export const GET = route(async (request: NextRequest) => {
  const minutes = parseMinutes(request.nextUrl.searchParams, 60);
  const now = Date.now();
  const db = await getDb();
  const rows = await deviceReadingsSince(db, now - minutes * 60_000);
  return new Response(deviceReadingsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${deviceCsvFilename(now)}"`,
      "Cache-Control": "no-store",
    },
  });
});
