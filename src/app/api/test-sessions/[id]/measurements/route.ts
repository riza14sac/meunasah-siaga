import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import { addManualMeasurement } from "@/lib/tests";

export const dynamic = "force-dynamic";

/** A multimeter reading typed in by hand: V (required), A, beban, catatan, waktu "HH:MM". */
export const POST = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  requireAdmin(request);
  const { id } = await params;
  const measurement = await addManualMeasurement(await getDb(), id, await readBody(request), Date.now());
  return NextResponse.json(measurement, { status: 201 });
});
