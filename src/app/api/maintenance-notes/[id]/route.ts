import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const DELETE = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  requireAdmin(request);
  const { id } = await params;
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM maintenance_notes WHERE id = ?", args: [id] });
  if (res.rowsAffected === 0) throw new HttpError(404, "Catatan tidak ditemukan");
  return NextResponse.json({ ok: true });
});
