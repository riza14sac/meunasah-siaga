import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteBlackout } from "@/lib/blackouts";
import { getDb } from "@/lib/db";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const DELETE = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  requireAdmin(request);
  const { id } = await params;
  await deleteBlackout(await getDb(), id);
  return NextResponse.json({ ok: true });
});
