"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Download, Gauge, Wifi, Zap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LineChart, type ChartSeries } from "@/components/ui/LineChart";
import { StatusPill } from "@/components/ui/StatusPill";
import { BUTTON, ICON_BOX } from "@/components/ui/styles";
import { GENERATOR_ONLINE_WINDOW_MS } from "@/lib/deviceState";
import { formatAgo, formatClock, formatClockSeconds } from "@/lib/format";
import { usePolling } from "@/lib/hooks";
import type { DeviceLatestResponse, DeviceReading } from "@/lib/types";

const POLL_MS = 2000;
const RANGES = [1, 10, 60] as const;
type Range = (typeof RANGES)[number];

/** Fixed decimals with a decimal comma: "5,12". */
function fixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

function agoText(ageMs: number): string {
  return ageMs < 60_000 ? `${Math.max(0, Math.floor(ageMs / 1000))} detik lalu` : formatAgo(ageMs);
}

function summarize(rows: DeviceReading[]) {
  if (rows.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let powerMax = -Infinity;
  for (const r of rows) {
    min = Math.min(min, r.gen_voltage);
    max = Math.max(max, r.gen_voltage);
    sum += r.gen_voltage;
    powerMax = Math.max(powerMax, r.gen_power);
  }
  return { min, avg: sum / rows.length, max, powerMax, count: rows.length };
}

export default function UjiGeneratorPage() {
  const [range, setRange] = useState<Range>(10);
  const latest = usePolling<DeviceLatestResponse>("/api/device/latest", POLL_MS);
  const history = usePolling<DeviceReading[]>(`/api/device/readings?minutes=${range}`, POLL_MS);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rows = history.data;
  const series = useMemo<ChartSeries[]>(
    () => [
      {
        label: "Tegangan",
        tone: "primary",
        style: "line",
        points: (rows ?? []).map((r) => ({ t: Date.parse(r.ts), v: r.gen_voltage })),
      },
    ],
    [rows]
  );
  const summary = useMemo(() => summarize(rows ?? []), [rows]);

  if (!latest.data) {
    return (
      <Card>
        <p className="text-[13px] text-ink-secondary">{latest.error ?? "Memuat…"}</p>
      </Card>
    );
  }

  const reading = latest.data.reading;
  if (!reading) return <EmptyState />;

  // Age on the server's clock, extended between polls so "Terputus" also shows when the server stops answering.
  const ageMs =
    Date.parse(latest.data.server_time) - Date.parse(reading.ts) + Math.max(0, now - (latest.updatedAt ?? now));
  const online = ageMs < GENERATOR_ONLINE_WINDOW_MS;

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
      <Card className="flex flex-col gap-4 lg:col-span-2 lg:justify-between">
        <div className="flex items-center gap-3">
          <span className={`${ICON_BOX} bg-primary-soft text-primary`}>
            <Zap size={18} strokeWidth={1.5} />
          </span>
          <h2 className="flex-1 text-sm font-semibold text-ink md:text-[15px]">Tegangan generator</h2>
          {online ? (
            <StatusPill tone="success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Terhubung
            </StatusPill>
          ) : (
            <StatusPill tone="neutral">Terputus · terakhir terlihat {formatClockSeconds(reading.ts)}</StatusPill>
          )}
        </div>
        <p className="flex items-baseline gap-2" aria-live="polite">
          <span className={`text-6xl font-bold tabular-nums leading-none md:text-7xl lg:text-8xl ${online ? "text-ink" : "text-ink-muted"}`}>
            {fixed(reading.gen_voltage, 2)}
          </span>
          <span className="text-2xl font-semibold text-ink-secondary">V</span>
        </p>
        <p className="text-xs text-ink-secondary md:text-[13px]">
          Diperbarui {agoText(ageMs)} · {reading.device_id}
          {latest.error ? ` · ${latest.error}` : ""}
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
        <Tile icon={Activity} label="Arus" value={fixed(reading.gen_current * 1000, 1)} unit="mA" />
        <Tile icon={Gauge} label="Daya" value={fixed(reading.gen_power * 1000, 1)} unit="mW" />
        <Tile icon={Wifi} label="Sinyal WiFi" value={reading.rssi === null ? "–" : String(reading.rssi).replace("-", "−")} unit="dBm" />
      </div>

      <Card className="flex flex-col gap-3 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Grafik tegangan</h2>
          <div role="group" aria-label="Rentang grafik" className="grid grid-cols-3 gap-1 rounded-md bg-surface-muted p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`rounded-sm px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  range === r ? "bg-primary text-white" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {r} menit
              </button>
            ))}
          </div>
        </div>
        <LineChart
          series={series}
          unit="V"
          digits={2}
          label={`Grafik tegangan generator ${range} menit terakhir`}
          formatTime={range === 60 ? formatClock : formatClockSeconds}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold text-ink">Ringkasan {range} menit terakhir</h2>
        {summary ? (
          <dl className="grid grid-cols-2 gap-3">
            <SummaryItem label="Tegangan min" value={`${fixed(summary.min, 2)} V`} />
            <SummaryItem label="Rata-rata" value={`${fixed(summary.avg, 2)} V`} />
            <SummaryItem label="Tegangan maks" value={`${fixed(summary.max, 2)} V`} />
            <SummaryItem label="Daya maks" value={`${fixed(summary.powerMax * 1000, 1)} mW`} />
            <SummaryItem label="Jumlah data" value={String(summary.count)} />
          </dl>
        ) : (
          <p className="text-[13px] text-ink-secondary">{history.error ?? "Tidak ada data pada rentang ini."}</p>
        )}
        <a href={`/api/device/export?minutes=${range}`} download className={`${BUTTON.secondary} mt-auto`}>
          <Download size={18} strokeWidth={1.5} />
          Unduh CSV
        </a>
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, label, value, unit }: { icon: LucideIcon; label: string; value: string; unit: string }) {
  return (
    <Card className="flex min-w-0 flex-col gap-2 !p-3 md:!p-4">
      <span className={`${ICON_BOX} bg-primary-soft text-primary`}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-ink-secondary md:text-xs">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
          <span className="text-lg font-bold tabular-nums text-ink md:text-xl">{value}</span>
          <span className="text-[11px] font-medium text-ink-secondary">{unit}</span>
        </p>
      </div>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-muted px-3 py-2.5">
      <dt className="truncate text-[11px] text-ink-secondary">{label}</dt>
      <dd className="truncate text-[15px] font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={`${ICON_BOX} bg-surface-muted text-icon`}>
          <Zap size={18} strokeWidth={1.5} />
        </span>
        <h2 className="text-[15px] font-semibold text-ink">Belum ada data dari ESP32</h2>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-[13px] leading-snug text-ink-secondary">
        <li>Pastikan ESP32 tersambung ke WiFi yang sama dengan laptop (lihat Serial Monitor).</li>
        <li>Cek alamat server di sketch: harus IP laptop, misalnya http://192.168.1.10:3000/api/ingest.</li>
        <li>Cek kunci API di sketch sama dengan DEVICE_API_KEY di .env.local.</li>
      </ul>
      <p className="text-xs text-ink-secondary">Halaman ini memeriksa data baru setiap 2 detik. Panduan: docs/UJI_GENERATOR.md.</p>
    </Card>
  );
}
