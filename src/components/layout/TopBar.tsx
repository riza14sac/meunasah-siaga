"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStatusContext } from "@/components/StatusProvider";
import { ModeChip } from "@/components/ui/ModeChip";
import { deviceConnection } from "@/lib/deviceState";
import { formatAgo, formatClock } from "@/lib/format";
import type { StatusResponse } from "@/lib/types";

const TITLES: [prefix: string, title: string][] = [
  ["/uji-generator", "Uji Generator"],
  ["/riwayat/pengujian", "Pengujian Alat"],
  ["/riwayat", "Riwayat"],
  ["/jadwal", "Jadwal Shalat"],
  ["/pengaturan", "Pengaturan"],
];

function titleFor(pathname: string): string {
  if (pathname === "/") return "Beranda";
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "MEUNASAH-SIAGA";
}

function connection(
  data: StatusResponse | null,
  error: string | null,
  receivedAt: number | null,
  nowMs: number
): { text: string; dot: string } {
  if (error) return { text: "Server tidak terjangkau", dot: "bg-danger" };
  if (!data) return { text: "Memuat…", dot: "bg-icon" };
  if (data.mode === "simulasi") return { text: "Menampilkan data simulasi", dot: "bg-warning" };
  const device = deviceConnection(data, receivedAt, nowMs);
  if (device.state === "never") return { text: "ESP32 belum pernah mengirim data", dot: "bg-icon" };
  if (device.state === "offline") {
    return { text: `ESP32 terputus · terakhir terlihat ${formatClock(device.lastSeen!)}`, dot: "bg-danger" };
  }
  return { text: `ESP32 terhubung · diperbarui ${formatAgo(device.ageMs)}`, dot: "bg-success" };
}

export function TopBar() {
  const pathname = usePathname();
  const { data, error, updatedAt } = useStatusContext();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const conn = connection(data, error, updatedAt, now);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface px-4 py-3 md:px-8 md:py-4">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-3 md:max-w-6xl">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-ink md:text-2xl">{titleFor(pathname)}</h1>
          {/* Uji Generator shows its own connection from device_readings, which this line does not see. */}
          {!pathname.startsWith("/uji-generator") && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-secondary md:text-xs">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${conn.dot}`} aria-hidden="true" />
              <span className="truncate">{conn.text}</span>
            </p>
          )}
        </div>
        <ModeChip mode={data?.mode} />
      </div>
    </header>
  );
}
