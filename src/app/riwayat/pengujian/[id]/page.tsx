"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Download, Play, Square, Trash2 } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import { useStatusContext } from "@/components/StatusProvider";
import { ManualMeasurementForm } from "@/components/tests/ManualMeasurementForm";
import { MeasurementList } from "@/components/tests/MeasurementList";
import { SessionStatePill, sessionDate } from "@/components/tests/SessionCard";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LineChart, type ChartSeries } from "@/components/ui/LineChart";
import { BUTTON } from "@/components/ui/styles";
import { Toast, useToast } from "@/components/ui/Toast";
import { deviceConnection } from "@/lib/deviceState";
import { formatAgo, formatClock, formatClockSeconds, formatMinutes, formatNumber } from "@/lib/format";
import { errorMessage, usePolling } from "@/lib/hooks";
import type { TestMeasurement, TestSession, TestSessionDetail, TestSummary } from "@/lib/types";

type DeleteTarget = { kind: "session" } | { kind: "row"; measurement: TestMeasurement };

function seriesFor(measurements: TestMeasurement[], pick: (m: TestMeasurement) => number | null): ChartSeries[] {
  const points = (sumber: TestMeasurement["sumber"]) =>
    measurements.flatMap((m) => {
      const v = pick(m);
      return m.sumber === sumber && v !== null ? [{ t: Date.parse(m.ts), v }] : [];
    });
  const series: ChartSeries[] = [
    { label: "ESP32", tone: "primary", style: "line", points: points("esp32") },
    { label: "Multimeter", tone: "warning", style: "dots", points: points("manual") },
  ];
  return series.filter((s) => s.points.length > 0);
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { adminFetch } = useAdmin();
  const { toast, showToast } = useToast();
  const [live, setLive] = useState(false);
  const { data, error, refresh } = usePolling<TestSessionDetail>(`/api/test-sessions/${id}`, live ? 5000 : 0);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const recording = data?.session.recording ?? false;
  useEffect(() => setLive(recording), [recording]);

  const measurements = data?.measurements;
  const charts = useMemo(
    () => ({
      voltage: seriesFor(measurements ?? [], (m) => m.gen_voltage),
      current: seriesFor(measurements ?? [], (m) => m.arus_a),
    }),
    [measurements]
  );

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <BackLink />
        <p className="text-[13px] text-ink-secondary">{error ?? "Memuat sesi pengujian…"}</p>
      </div>
    );
  }

  const { session, summary } = data;
  const spanMs = summary.first_ts && summary.last_ts ? Date.parse(summary.last_ts) - Date.parse(summary.first_ts) : 0;
  const formatTime = spanMs < 15 * 60_000 ? formatClockSeconds : formatClock;

  async function setRecording(action: "mulai" | "selesai") {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/test-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Gagal mengubah perekaman"));
      refresh();
      showToast(action === "mulai" ? "Perekaman dimulai" : "Perekaman selesai");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengubah perekaman", "critical");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === "session") {
        const res = await adminFetch(`/api/test-sessions/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await errorMessage(res, "Gagal menghapus sesi"));
        router.push("/riwayat/pengujian");
        return;
      }
      const res = await adminFetch(`/api/test-sessions/${id}/measurements/${deleteTarget.measurement.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Gagal menghapus data"));
      refresh();
      showToast("Data pengukuran dihapus");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus", "critical");
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <SessionHeader session={session} onDelete={() => setDeleteTarget({ kind: "session" })} />

      <div className="grid gap-4 md:gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_1fr]">
        <div className="lg:col-start-3 lg:row-start-1">
          <RecordCard session={session} busy={busy} onAction={setRecording} />
        </div>

        <div className="flex flex-col gap-4 md:gap-5 lg:col-span-2 lg:col-start-1 lg:row-span-4 lg:row-start-1">
          <SummaryGrid summary={summary} />
          <Card>
            <h3 className="text-[15px] font-semibold text-ink">Tegangan generator</h3>
            <p className="mb-3 mt-0.5 text-xs text-ink-secondary">Garis dari ESP32, titik dari multimeter.</p>
            <LineChart
              series={charts.voltage}
              unit="V"
              digits={2}
              label="Grafik tegangan generator terhadap waktu"
              formatTime={formatTime}
            />
          </Card>
          <Card>
            <h3 className="text-[15px] font-semibold text-ink">Arus generator</h3>
            {charts.current.length > 0 ? (
              <>
                <p className="mb-3 mt-0.5 text-xs text-ink-secondary">Daya = tegangan × arus pada waktu yang sama.</p>
                <LineChart
                  series={charts.current}
                  unit="A"
                  digits={3}
                  label="Grafik arus generator terhadap waktu"
                  formatTime={formatTime}
                />
              </>
            ) : (
              <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
                Belum ada data arus. Sensor arus generator (INA219 kedua) belum terpasang, jadi isi arus lewat pengukuran
                multimeter.
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-start-3 lg:row-start-2">
          <ManualMeasurementForm
            sessionId={id}
            onSaved={() => {
              refresh();
              showToast("Pengukuran disimpan");
            }}
          />
        </div>

        <div className="lg:col-start-3 lg:row-start-3">
          <MeasurementList
            measurements={data.measurements}
            onDelete={(measurement) => setDeleteTarget({ kind: "row", measurement })}
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === "session" ? "Hapus sesi ini?" : "Hapus data ini?"}
        description={
          deleteTarget?.kind === "session"
            ? `Sesi "${session.judul}" beserta ${summary.count} data pengukurannya akan dihapus dan tidak dapat dikembalikan.`
            : deleteTarget?.kind === "row"
              ? `Data pukul ${formatClockSeconds(deleteTarget.measurement.ts)} (${formatNumber(deleteTarget.measurement.gen_voltage, 2)} V) akan dihapus dan tidak dapat dikembalikan.`
              : ""
        }
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/riwayat/pengujian" className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-primary">
      <ChevronLeft size={18} strokeWidth={1.5} />
      Pengujian Alat
    </Link>
  );
}

function SessionHeader({ session, onDelete }: { session: TestSession; onDelete: () => void }) {
  const facts = [
    session.kondisi && `Kondisi: ${session.kondisi}`,
    session.tekanan_bar !== null && `Tekanan ${formatNumber(session.tekanan_bar, 2)} bar`,
    session.debit_lpm !== null && `Debit ${formatNumber(session.debit_lpm, 1)} L/menit`,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <div className="flex flex-col gap-3">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-snug text-ink md:text-2xl">{session.judul}</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {sessionDate(session.tanggal)}
            {session.lokasi ? ` · ${session.lokasi}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/test-sessions/${session.id}/csv`} download className={BUTTON.secondary}>
            <Download size={18} strokeWidth={1.5} />
            Unduh CSV
          </a>
          <button type="button" onClick={onDelete} className={BUTTON.ghost}>
            <Trash2 size={18} strokeWidth={1.5} />
            Hapus
          </button>
        </div>
      </div>
      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <li key={fact} className="rounded-full bg-surface px-3 py-1 text-xs text-ink-secondary shadow-card">
              {fact}
            </li>
          ))}
        </ul>
      )}
      {session.catatan && <p className="text-[13px] leading-snug text-ink-secondary">{session.catatan}</p>}
    </div>
  );
}

function RecordCard({
  session,
  busy,
  onAction,
}: {
  session: TestSession;
  busy: boolean;
  onAction: (action: "mulai" | "selesai") => void;
}) {
  const { data: status, updatedAt } = useStatusContext();
  const device = deviceConnection(status, updatedAt, Date.now());
  const deviceLine =
    device.state === "never"
      ? { text: "Belum ada data dari ESP32", dot: "bg-icon" }
      : device.state === "online"
        ? { text: `ESP32 terhubung · data terakhir ${formatAgo(device.ageMs)}`, dot: "bg-success" }
        : { text: `ESP32 terputus · terakhir terlihat ${formatClock(device.lastSeen!)}`, dot: "bg-danger" };

  const state = session.recording
    ? `Merekam sejak ${formatClock(session.started_at!)}`
    : session.started_at && session.ended_at
      ? `Direkam ${formatClock(session.started_at)}–${formatClock(session.ended_at)}`
      : "Belum direkam";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Rekam data ESP32</h3>
          <p className="mt-0.5 text-[13px] text-ink-secondary">{state}</p>
        </div>
        <SessionStatePill session={session} />
      </div>
      <p className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-ink-secondary">
        <span className={`h-2 w-2 shrink-0 rounded-full ${deviceLine.dot}`} aria-hidden="true" />
        {deviceLine.text}
      </p>
      {session.recording ? (
        <button type="button" disabled={busy} onClick={() => onAction("selesai")} className={BUTTON.danger}>
          <Square size={16} strokeWidth={1.5} />
          Selesai rekam
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => onAction("mulai")} className={BUTTON.primary}>
          <Play size={16} strokeWidth={1.5} />
          {session.started_at ? "Lanjutkan rekam" : "Mulai rekam"}
        </button>
      )}
      <p className="text-xs leading-snug text-ink-secondary">
        Selama merekam, setiap data dari ESP32 otomatis tercatat di sesi ini. Data simulasi tidak pernah ikut masuk.
      </p>
    </Card>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface p-4 shadow-card">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-secondary">{sub}</p>
    </div>
  );
}

function SummaryGrid({ summary }: { summary: TestSummary }) {
  const v = (n: number | null, digits = 2) => (n === null ? "–" : formatNumber(n, digits));
  const durationMs =
    summary.first_ts && summary.last_ts ? Date.parse(summary.last_ts) - Date.parse(summary.first_ts) : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 2xl:grid-cols-4">
      <SummaryTile
        label="Tegangan maks"
        value={summary.v_max === null ? "–" : `${v(summary.v_max)} V`}
        sub={summary.v_max === null ? "Belum ada data" : `min ${v(summary.v_min)} · rata-rata ${v(summary.v_avg)} V`}
      />
      <SummaryTile
        label="Daya maks"
        value={summary.p_max === null ? "–" : `${v(summary.p_max)} W`}
        sub={summary.a_max === null ? "Perlu data arus" : `arus maks ${v(summary.a_max, 3)} A`}
      />
      <SummaryTile
        label="Jumlah data"
        value={String(summary.count)}
        sub={`ESP32 ${summary.count_esp32} · manual ${summary.count_manual}`}
      />
      <SummaryTile
        label="Durasi data"
        value={durationMs === null ? "–" : durationMs < 60_000 ? "< 1 mnt" : formatMinutes(durationMs / 60_000)}
        sub={
          summary.first_ts && summary.last_ts
            ? `${formatClock(summary.first_ts)}–${formatClock(summary.last_ts)} WIB`
            : "Belum ada data"
        }
      />
    </div>
  );
}
