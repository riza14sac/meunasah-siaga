import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { deleteMeasurement } from "@/lib/tests";

export const dynamic = "force-dynamic";

export const DELETE = route(
  async (request: NextRequest, { params }: { params: Promise<{ id: string; mid: string }> }) => {
    requireAdmin(request);
    const { id, mid } = await params;
    const measurementId = Number(mid);
    if (!Number.isInteger(measurementId)) throw new HttpError(404, "Data pengukuran tidak ditemukan");
    await deleteMeasurement(await getDb(), id, measurementId);
    return NextResponse.json({ ok: true });
  }
);
