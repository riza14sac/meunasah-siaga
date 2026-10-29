import { NextRequest, NextResponse } from "next/server";
import { listBlackouts } from "@/lib/blackouts";
import { getDb } from "@/lib/db";
import { route } from "@/lib/http";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Blackouts of the current mode; ?range=7d limits how far back to look. */
export const GET = route(async (request: NextRequest) => {
  const range = request.nextUrl.searchParams.get("range");
  const days = range && /^\d+d$/.test(range) ? Math.min(366, Number(range.slice(0, -1))) : null;
  const sinceIso = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

  const db = await getDb();
  const { mode } = await getSettings(db);
  return NextResponse.json({ mode, events: await listBlackouts(db, mode, sinceIso) });
});
