import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateLong, formatNumber } from "@/lib/format";
import { wibDayStartFromKey } from "@/lib/time";
import type { TestSession, TestSessionWithSummary } from "@/lib/types";

export function sessionDate(tanggal: string): string {
  return formatDateLong(wibDayStartFromKey(tanggal));
}

/** Recording state; pass `count` so a session with only multimeter data is not shown as empty. */
export function SessionStatePill({
  session,
  count,
}: {
  session: Pick<TestSession, "recording" | "started_at">;
  count?: number;
}) {
  if (session.recording) {
    return (
      <StatusPill tone="danger">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
        Merekam
      </StatusPill>
    );
  }
  if (session.started_at) return <StatusPill tone="success">Selesai</StatusPill>;
  if (count) return <StatusPill tone="warning">Data manual</StatusPill>;
  return <StatusPill tone="neutral">Belum direkam</StatusPill>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-ink-secondary">{label}</dt>
      <dd className="mt-0.5 truncate text-[15px] font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export function SessionCard({ session }: { session: TestSessionWithSummary }) {
  const { summary } = session;
  return (
    <Link
      href={`/riwayat/pengujian/${session.id}`}
      className="group flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card md:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">{session.judul}</h3>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {sessionDate(session.tanggal)}
            {session.lokasi ? ` · ${session.lokasi}` : ""}
          </p>
        </div>
        <SessionStatePill session={session} count={summary.count} />
      </div>

      {session.kondisi && <p className="text-[13px] leading-snug text-ink-secondary">{session.kondisi}</p>}

      <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3">
        <MiniStat label="Tegangan maks" value={summary.v_max === null ? "–" : `${formatNumber(summary.v_max, 2)} V`} />
        <MiniStat label="Daya maks" value={summary.p_max === null ? "–" : `${formatNumber(summary.p_max, 2)} W`} />
        <MiniStat label="Data" value={String(summary.count)} />
      </dl>

      <span className="flex items-center gap-1 text-[13px] font-semibold text-primary">
        Lihat hasil
        <ChevronRight size={16} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
