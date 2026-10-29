import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import { createSession, listSessions } from "@/lib/tests";

export const dynamic = "force-dynamic";

/** Test sessions are shown as-is in both Real and Simulasi mode. */
export const GET = route(async (request: NextRequest) => {
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 100;
  return NextResponse.json({ sessions: await listSessions(await getDb(), limit) });
});

export const POST = route(async (request: NextRequest) => {
  requireAdmin(request);
  const session = await createSession(await getDb(), await readBody(request), Date.now());
  return NextResponse.json(session, { status: 201 });
});
