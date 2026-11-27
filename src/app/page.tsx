"use client";

import { useMemo } from "react";
import { BatteryCharging, Info, Lightbulb, Moon, Power, PowerOff, Sun, TriangleAlert, Zap } from "lucide-react";
import { useStatusContext } from "@/components/StatusProvider";
import { LatestTestCard } from "@/components/tests/LatestTestCard";
import { BatteryGauge } from "@/components/ui/BatteryGauge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { TrendChart } from "@/components/ui/TrendChart";
import { formatClock, formatDuration, formatNumber } from "@/lib/format";
import { usePolling } from "@/lib/hooks";
import { PRIORITY_LABELS, prayerLabel } from "@/lib/prayer";
import { atWibTime, DAY_MS, wibDayStart } from "@/lib/time";
import type { PrayerKey, ReadingPoint } from "@/lib/types";

export default function BerandaPage() {
  const { data } = useStatusContext();
  const { data: series } = usePolling<{ points: ReadingPoint[] }>("/api/readings?range=24h", 60_000);
  const points = useMemo(() => series?.points ?? [], [series]);
  const slots = data?.schedule.slots;

  const prayerMarks = useMemo(() => {
    if (!slots || points.length === 0) return [];
    const last = Date.parse(points[points.length - 1].ts);
    const marks: { key: PrayerKey; atMs: number }[] = [];
    for (let day = wibDayStart(Date.parse(points[0].ts)); day <= last; day += DAY_MS) {
      for (const slot of slots) marks.push({ key: slot.prayer, atMs: atWibTime(day, slot.time) });
    }
    return marks;
  }, [slots, points]);

  const reading = data?.reading ?? null;
  const reserve = data?.settings.reserve_min ?? 20;
  // "full" = payload baterai/PLN lengkap; "generator-only" = payload ringkas (INA219 di baterai).
  const batteryKnown = data?.data_source === "full";
  const compact = data?.data_source === "generator-only";
  const lampPct = batteryKnown && reading ? Math.max(reading.lamp1_pct, reading.lamp2_pct) : 0;
  const voltageTrend = points.slice(-24).map((p) => p.gen_voltage);
  const source = data?.mode === "simulasi" ? "simulasi" : "ESP32";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {data?.active_blackout && (
        <div className="flex items-center gap-3 rounded-lg bg-danger px-4 py-3 text-white">
          <TriangleAlert size={20} strokeWidth={1.5} className="shrink-0" />
          <p className="text-sm">
            <span className="font-bold">PLN padam sejak {formatClock(data.active_blackout.start_time)}</span>
            <span> · sudah {formatDuration(data.active_blackout.start_time, null)}, lampu cadangan aktif.</span>
          </p>
        </div>
      )}

      {compact && (
        <div className="flex items-start gap-3 rounded-lg bg-info-soft px-4 py-3 text-info-text">
          <Info size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-snug">
            <span className="font-bold">Mode ringkas: data baterai.</span> Beranda menampilkan tegangan baterai dari
            INA219. Persentase baterai, status PLN, dan energi belum dikirim; gunakan firmware lengkap untuk data itu.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
        <Card className="flex flex-col gap-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink md:text-[15px]">Status sistem saat ini</h2>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {reading
                  ? `Data ${source} pukul ${formatClock(reading.ts)} WIB${compact ? " · mode ringkas" : ""}`
                  : `Belum ada data ${source}`}
              </p>
            </div>
            {reading &&
              (batteryKnown ? (
                <StatusPill tone={reading.pln_on ? "success" : "danger"}>
                  {reading.pln_on ? <Power size={14} strokeWidth={1.5} /> : <PowerOff size={14} strokeWidth={1.5} />}
                  {reading.pln_on ? "Listrik PLN hidup" : "Listrik PLN padam"}
                </StatusPill>
              ) : (
                <StatusPill tone="neutral">
                  <PowerOff size={14} strokeWidth={1.5} />
                  Status PLN belum tersedia
                </StatusPill>
              ))}
          </div>

          <div className="flex flex-wrap items-center gap-6 md:gap-8">
            {batteryKnown ? (
              <BatteryGauge percent={reading?.bat_percent ?? 0} reservePercent={reserve} />
            ) : (
              <div className="flex h-[168px] w-[168px] shrink-0 flex-col items-center justify-center rounded-full border-[14px] border-primary-soft">
                <span className="text-2xl font-bold tabular-nums text-ink">
                  {reading ? formatNumber(reading.gen_voltage, 2) : "—"}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-ink-secondary">V · baterai</span>
                <span className="text-[10px] text-ink-muted">persentase belum ada</span>
              </div>
            )}

            <div className="flex min-w-[12rem] flex-1 flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-ink-secondary">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb size={16} strokeWidth={1.5} /> Kecerahan lampu
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{batteryKnown ? `${lampPct}%` : "—"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-warning transition-[width] duration-500" style={{ width: `${lampPct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-ink-secondary">
                <span className="flex items-center gap-1.5">
                  <Zap size={16} strokeWidth={1.5} /> {compact ? "Tegangan baterai" : "Tegangan generator"}
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {reading ? `${formatNumber(reading.gen_voltage, 2)} V` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-secondary">
                <span className="flex items-center gap-1.5">
                  <BatteryCharging size={16} strokeWidth={1.5} /> Daya pengisian
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {batteryKnown ? `${formatNumber(data?.charge_power_w ?? 0, 2)} W` : "—"}
                </span>
              </div>

              <p className="text-xs leading-snug text-ink-secondary">
                Titik kecil pada cincin menandai cadangan minimum ({reserve}%). Di bawahnya lampu diredupkan otomatis.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4 md:gap-5">
          <LatestTestCard />

          <Card>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink md:text-[15px]">
              <Moon size={16} strokeWidth={1.5} /> Waktu shalat berikutnya
            </h2>
            {data?.next_prayer ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-2xl font-bold text-ink">{prayerLabel(data.next_prayer.prayer)}</span>
                <span className="text-sm tabular-nums text-ink-secondary">{formatClock(data.next_prayer.at)}</span>
                <StatusPill tone={data.next_prayer.priority === "tinggi" ? "warning" : data.next_prayer.priority === "sedang" ? "info" : "neutral"}>
                  Prioritas lampu {PRIORITY_LABELS[data.next_prayer.priority].toLowerCase()}
                </StatusPill>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-secondary">Memuat jadwal…</p>
            )}
            <p className="mt-1 text-xs text-ink-secondary">{data?.schedule.profile_name ?? ""}</p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard
          icon={Zap}
          label={compact ? "Tegangan baterai" : "Tegangan generator"}
          value={reading ? formatNumber(reading.gen_voltage, 2) : "—"}
          unit={reading ? "V" : undefined}
          tone="accent"
          trend={voltageTrend}
        />
        <StatCard
          icon={BatteryCharging}
          label="Daya pengisian"
          value={batteryKnown ? formatNumber(data?.charge_power_w ?? 0, 2) : "—"}
          unit={batteryKnown ? "W" : undefined}
          sub={batteryKnown ? undefined : "Belum ada data pengisian"}
          tone="good"
        />
        <StatCard
          icon={Sun}
          label="Energi masuk hari ini"
          value={batteryKnown ? formatNumber(data?.today.energy_in_wh ?? 0, 2) : "—"}
          unit={batteryKnown ? "Wh" : undefined}
          sub={batteryKnown ? undefined : "Butuh data lengkap"}
          tone="good"
        />
        <StatCard
          icon={PowerOff}
          label="Pemadaman hari ini"
          value={String(data?.today.blackout_count ?? 0)}
          unit="kali"
          tone={data && data.today.blackout_count > 0 ? "warn" : "good"}
        />
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink md:text-[15px]">Tren baterai 24 jam</h2>
          <p className="text-xs text-ink-secondary">
            {batteryKnown
              ? "Ditandai lima waktu shalat, bukan jam biasa"
              : "Grafik baterai butuh data persentase baterai (firmware lengkap)"}
          </p>
        </div>
        <TrendChart points={points} prayerMarks={prayerMarks} />
      </Card>
    </div>
  );
}
