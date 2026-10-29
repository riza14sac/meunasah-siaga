"use client";

import Link from "next/link";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ICON_BOX } from "@/components/ui/styles";
import { formatNumber } from "@/lib/format";
import { usePolling } from "@/lib/hooks";
import type { TestSessionWithSummary } from "@/lib/types";
import { SessionStatePill, sessionDate } from "./SessionCard";

/** Beranda card: the dosen opens the site there, so the latest test result must be one tap away. */
export function LatestTestCard({ className = "" }: { className?: string }) {
  const { data, error } = usePolling<{ sessions: TestSessionWithSummary[] }>("/api/test-sessions?limit=1", 30_000);
  const session = data?.sessions[0] ?? null;

  return (
    <Card className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`${ICON_BOX} bg-purple-soft text-purple-text`}>
          <FlaskConical size={18} strokeWidth={1.5} />
        </span>
        <h2 className="flex-1 text-sm font-semibold text-ink md:text-[15px]">Pengujian alat terakhir</h2>
        {session && <SessionStatePill session={session} count={session.summary.count} />}
      </div>

      {!data ? (
        <p className="text-[13px] text-ink-secondary">{error ?? "Memuat…"}</p>
      ) : !session ? (
        <p className="text-[13px] text-ink-secondary">
          Belum ada sesi pengujian.{" "}
          <Link href="/riwayat/pengujian" className="font-semibold text-primary">
            Buat sesi pertama
          </Link>
        </p>
      ) : (
        <>
          <div>
            <p className="text-[15px] font-semibold leading-snug text-ink">{session.judul}</p>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {sessionDate(session.tanggal)}
              {session.kondisi ? ` · ${session.kondisi}` : ""}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-surface-muted px-3 py-2.5">
              <dt className="text-[11px] text-ink-secondary">Tegangan maks</dt>
              <dd className="text-xl font-bold tabular-nums text-ink">
                {session.summary.v_max === null ? "–" : `${formatNumber(session.summary.v_max, 2)} V`}
              </dd>
            </div>
            <div className="rounded-md bg-surface-muted px-3 py-2.5">
              <dt className="text-[11px] text-ink-secondary">Daya maks</dt>
              <dd className="text-xl font-bold tabular-nums text-ink">
                {session.summary.p_max === null ? "–" : `${formatNumber(session.summary.p_max, 2)} W`}
              </dd>
            </div>
          </dl>
          <Link
            href={`/riwayat/pengujian/${session.id}`}
            className="flex items-center gap-1 text-[13px] font-semibold text-primary"
          >
            Lihat hasil pengujian
            <ChevronRight size={16} strokeWidth={1.5} />
          </Link>
        </>
      )}
    </Card>
  );
}
