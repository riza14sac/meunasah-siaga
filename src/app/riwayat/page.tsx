"use client";

import { useEffect, useState } from "react";
import { Plus, PowerOff, Trash2, Wrench } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RIWAYAT_TABS, SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { StatusPill } from "@/components/ui/StatusPill";
import { BUTTON, INPUT } from "@/components/ui/styles";
import { Toast, useToast } from "@/components/ui/Toast";
import { formatDateTime, formatDuration } from "@/lib/format";
import { errorMessage } from "@/lib/hooks";
import type { BlackoutEvent, MaintenanceNote } from "@/lib/types";

function OutcomePill({ event }: { event: BlackoutEvent }) {
  if (event.end_time === null) return <StatusPill tone="warning">Berlangsung</StatusPill>;
  if (event.outcome === "bertahan") return <StatusPill tone="success">Bertahan</StatusPill>;
  if (event.outcome === "gagal") return <StatusPill tone="danger">Gagal</StatusPill>;
  if (event.outcome === "siang") return <StatusPill tone="info">Siang</StatusPill>;
  return <StatusPill tone="neutral">Selesai</StatusPill>;
}

const NOTE_TONE: Record<string, string> = {
  bertahan: "text-success-text",
  gagal: "text-danger",
  siang: "text-info-text",
};

export default function RiwayatPage() {
  const { adminFetch } = useAdmin();
  const { toast, showToast } = useToast();
  const [events, setEvents] = useState<BlackoutEvent[] | null>(null);
  const [notes, setNotes] = useState<MaintenanceNote[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "blackout" | "note"; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/blackout-events", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/maintenance-notes", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([eventsRes, notesRes]: [{ events: BlackoutEvent[] }, { notes: MaintenanceNote[] }]) => {
        setEvents(eventsRes.events);
        setNotes(notesRes.notes);
      })
      .catch(() => showToast("Gagal memuat riwayat", "critical"));
  }, [showToast]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const url =
        deleteTarget.type === "blackout" ? `/api/blackout-events/${deleteTarget.id}` : `/api/maintenance-notes/${deleteTarget.id}`;
      const res = await adminFetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, "Gagal menghapus"));
      if (deleteTarget.type === "blackout") {
        setEvents((prev) => prev?.filter((e) => e.id !== deleteTarget.id) ?? prev);
        showToast("Kejadian pemadaman dihapus");
      } else {
        setNotes((prev) => prev?.filter((n) => n.id !== deleteTarget.id) ?? prev);
        showToast("Catatan pemeliharaan dihapus");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus", "critical");
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await adminFetch("/api/maintenance-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Gagal menyimpan catatan"));
      const created = (await res.json()) as MaintenanceNote;
      setNotes((prev) => [created, ...(prev ?? [])]);
      setNewNote("");
      showToast("Catatan pemeliharaan ditambahkan");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan catatan", "critical");
    } finally {
      setAddingNote(false);
    }
  }

  const deleteButton = (ev: BlackoutEvent) => (
    <button
      type="button"
      disabled={ev.end_time === null}
      onClick={() => setDeleteTarget({ type: "blackout", id: ev.id })}
      aria-label="Hapus kejadian"
      title={ev.end_time === null ? "Tidak bisa menghapus pemadaman yang masih berlangsung" : "Hapus kejadian"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-icon hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Trash2 size={18} strokeWidth={1.5} />
    </button>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <SegmentedLinks items={RIWAYAT_TABS} label="Jenis riwayat" />

      <Card>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink md:text-[15px]">
          <PowerOff size={16} strokeWidth={1.5} /> Kejadian pemadaman PLN
        </h2>

        {events === null ? (
          <p className="mt-4 text-sm text-ink-secondary">Memuat riwayat…</p>
        ) : events.length === 0 ? (
          <p className="mt-4 text-sm text-ink-secondary">Belum ada pemadaman yang tercatat.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2 rounded-md bg-surface-muted p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold tabular-nums text-ink">{formatDateTime(ev.start_time)}</p>
                    <OutcomePill event={ev} />
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-ink-secondary">
                    Baterai awal {ev.battery_at_start.toFixed(0)}% · {formatDuration(ev.start_time, ev.end_time)}
                  </p>
                  {(ev.fail_reason ?? ev.note) && (
                    <p className={`mt-1 text-[13px] ${NOTE_TONE[ev.outcome ?? ""] ?? "text-ink-secondary"}`}>
                      {ev.fail_reason ?? ev.note}
                    </p>
                  )}
                </div>
                {deleteButton(ev)}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink md:text-[15px]">
          <Wrench size={16} strokeWidth={1.5} /> Catatan pemeliharaan
        </h2>

        <form onSubmit={submitNote} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Contoh: baterai diganti, turbin dibersihkan…"
            aria-label="Catatan pemeliharaan baru"
            className={`${INPUT} flex-1`}
          />
          <button type="submit" disabled={addingNote || !newNote.trim()} className={BUTTON.primary}>
            <Plus size={18} strokeWidth={1.5} /> Tambah
          </button>
        </form>

        {notes === null ? (
          <p className="mt-4 text-sm text-ink-secondary">Memuat catatan…</p>
        ) : notes.length === 0 ? (
          <p className="mt-4 text-sm text-ink-secondary">Belum ada catatan pemeliharaan.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 rounded-md bg-surface-muted px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{n.note}</p>
                  <p className="mt-0.5 text-xs text-ink-secondary">{formatDateTime(n.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: "note", id: n.id })}
                  aria-label="Hapus catatan"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-icon hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.type === "blackout" ? "Hapus kejadian ini?" : "Hapus catatan ini?"}
        description="Data yang dihapus tidak dapat dikembalikan."
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
