import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import { deleteSession, getSessionDetail, updateSession } from "@/lib/tests";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: NextRequest, { params }: Context) => {
  const { id } = await params;
  return NextResponse.json(await getSessionDetail(await getDb(), id));
});

/** Edit fields, or `{ "action": "mulai" | "selesai" }` to start or stop recording. */
export const PATCH = route(async (request: NextRequest, { params }: Context) => {
  requireAdmin(request);
  const { id } = await params;
  return NextResponse.json(await updateSession(await getDb(), id, await readBody(request), Date.now()));
});

export const DELETE = route(async (request: NextRequest, { params }: Context) => {
  requireAdmin(request);
  const { id } = await params;
  await deleteSession(await getDb(), id);
  return NextResponse.json({ ok: true });
});
