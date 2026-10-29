import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { getDb, str } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import type { MaintenanceNote } from "@/lib/types";
import { textField } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const db = await getDb();
  const res = await db.execute("SELECT id, note, created_at FROM maintenance_notes ORDER BY created_at DESC LIMIT 200");
  const notes: MaintenanceNote[] = res.rows.map((r) => ({ id: str(r.id), note: str(r.note), created_at: str(r.created_at) }));
  return NextResponse.json({ notes });
});

export const POST = route(async (request: NextRequest) => {
  requireAdmin(request);
  const note = textField(await readBody(request), "note", { label: "Catatan", max: 500 });
  const created: MaintenanceNote = { id: randomUUID(), note, created_at: new Date().toISOString() };
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO maintenance_notes (id, note, created_at) VALUES (?, ?, ?)",
    args: [created.id, created.note, created.created_at],
  });
  return NextResponse.json(created, { status: 201 });
});
