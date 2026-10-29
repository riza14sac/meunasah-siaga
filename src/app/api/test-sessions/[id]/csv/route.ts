import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { route } from "@/lib/http";
import { getSessionDetail, sessionCsv } from "@/lib/tests";

export const dynamic = "force-dynamic";

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sesi"
  );
}

export const GET = route(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { session, measurements } = await getSessionDetail(await getDb(), id);
  return new Response(sessionCsv(measurements), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pengujian-${session.tanggal}-${slug(session.judul)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
