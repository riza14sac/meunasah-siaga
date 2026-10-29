import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route } from "@/lib/http";
import { parseRangeMs } from "@/lib/range";
import { getReadingPoints } from "@/lib/readings";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Chart points for the current mode, e.g. ?range=60m, 24h or 7d. */
export const GET = route(async (request: NextRequest) => {
  const range = request.nextUrl.searchParams.get("range");
  const rangeMs = parseRangeMs(range);
  const db = await getDb();
  const { mode } = await getSettings(db);
  const points = await getReadingPoints(db, mode, Date.now() - rangeMs, rangeMs);
  return NextResponse.json({ mode, range: range ?? "24h", points });
});
