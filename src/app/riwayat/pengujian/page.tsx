"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Plus } from "lucide-react";
import { NewSessionForm } from "@/components/tests/NewSessionForm";
import { SessionCard } from "@/components/tests/SessionCard";
import { Card } from "@/components/ui/Card";
import { RIWAYAT_TABS, SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { BUTTON, ICON_BOX } from "@/components/ui/styles";
import { usePolling } from "@/lib/hooks";
import type { TestSessionWithSummary } from "@/lib/types";

export default function PengujianPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { data, error } = usePolling<{ sessions: TestSessionWithSummary[] }>("/api/test-sessions", 10_000);
  const sessions = data?.sessions ?? null;
  const recording = sessions?.find((s) => s.recording) ?? null;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <SegmentedLinks items={RIWAYAT_TABS} label="Jenis riwayat" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink md:text-xl">Hasil Pengujian Alat</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-ink-secondary md:text-sm">
            Data uji turbin dari ESP32 dan pengukuran multimeter. Selalu tampil apa adanya, baik di Mode Real maupun Simulasi.
          </p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={BUTTON.primary}>
            <Plus size={18} strokeWidth={1.5} />
            Sesi baru
          </button>
        )}
      </div>

      {creating && (
        <NewSessionForm onCancel={() => setCreating(false)} onCreated={(id) => router.push(`/riwayat/pengujian/${id}`)} />
      )}

      {recording && (
        <Link
          href={`/riwayat/pengujian/${recording.id}`}
          className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 text-[13px] text-ink shadow-card"
        >
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Sedang merekam:</span> {recording.judul}. Data ESP32 masuk otomatis.
          </span>
        </Link>
      )}

      {sessions === null ? (
        <p className="text-[13px] text-ink-secondary">{error ?? "Memuat sesi pengujian…"}</p>
      ) : sessions.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className={`${ICON_BOX} h-12 w-12 bg-purple-soft text-purple-text`}>
            <FlaskConical size={24} strokeWidth={1.5} />
          </span>
          <p className="text-[15px] font-semibold text-ink">Belum ada sesi pengujian</p>
          <p className="max-w-sm text-[13px] leading-snug text-ink-secondary">
            Buat sesi, lalu tekan Mulai rekam saat kran dibuka. Hasil multimeter bisa ditambahkan manual.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
