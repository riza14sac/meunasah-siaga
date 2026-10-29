"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, X, Save } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/hooks";
import { DEFAULT_SLOTS, PRAYER_KEYS, prayerLabel, slotOf } from "@/lib/prayer";
import type { ScheduleProfileDto } from "@/lib/types";

type Draft = Pick<ScheduleProfileDto, "name" | "subuh" | "zuhur" | "ashar" | "maghrib" | "isya">;

const EMPTY_DRAFT = {
  name: "",
  ...Object.fromEntries(PRAYER_KEYS.map((key) => [key, slotOf(DEFAULT_SLOTS, key).time])),
} as Draft;

function TimeFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
      {PRAYER_KEYS.map((key) => (
        <label key={key} className="flex flex-col gap-1">
          <span className="text-xs text-ink-faint">{prayerLabel(key)}</span>
          <input
            type="time"
            value={draft[key]}
            onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            className="rounded-lg border border-border bg-surface-sunken px-2.5 py-1.5 text-sm text-ink"
          />
        </label>
      ))}
    </div>
  );
}

export default function JadwalPage() {
  const { adminFetch } = useAdmin();
  const [profiles, setProfiles] = useState<ScheduleProfileDto[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleProfileDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "good" | "critical" } | null>(null);

  async function load() {
    const res = await fetch("/api/schedule-profiles");
    const json = (await res.json()) as { profiles: ScheduleProfileDto[] };
    setProfiles(json.profiles);
  }

  useEffect(() => {
    load().catch(() => setToast({ message: "Gagal memuat jadwal", tone: "critical" }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!addDraft.name.trim()) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/schedule-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addDraft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menambah jadwal");
      }
      await load();
      setShowAdd(false);
      setAddDraft(EMPTY_DRAFT);
      setToast({ message: "Jadwal baru ditambahkan", tone: "good" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menambah jadwal", tone: "critical" });
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/schedule-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyimpan");
      }
      await load();
      setEditingId(null);
      setToast({ message: "Jadwal diperbarui", tone: "good" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menyimpan", tone: "critical" });
    } finally {
      setBusy(false);
    }
  }

  async function setActive(id: string) {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/schedule-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Gagal mengaktifkan jadwal"));
      await load();
      setToast({ message: "Jadwal aktif diperbarui", tone: "good" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal mengaktifkan jadwal", tone: "critical" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await adminFetch(`/api/schedule-profiles/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menghapus jadwal");
      }
      await load();
      setToast({ message: "Jadwal dihapus", tone: "good" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menghapus jadwal", tone: "critical" });
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {profiles === null ? (
        <p className="text-sm text-ink-faint">Memuat jadwal…</p>
      ) : (
        profiles.map((p) => (
          <Card key={p.id}>
            {editingId === p.id ? (
              <div className="flex flex-col gap-3">
                <input
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  className="rounded-lg border border-border bg-surface-sunken px-3 py-1.5 text-sm font-medium text-ink"
                />
                <TimeFields draft={editDraft} onChange={setEditDraft} />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
                  >
                    <X size={14} strokeWidth={2.3} /> Batal
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => saveEdit(p.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
                  >
                    <Save size={14} strokeWidth={2.3} /> Simpan
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-ink">{p.name}</h2>
                    {p.active && (
                      <StatusPill tone="good">
                        <CheckCircle2 size={12} strokeWidth={2.4} /> Aktif
                      </StatusPill>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!p.active && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setActive(p.id)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft"
                      >
                        Jadikan aktif
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(p.id);
                        setEditDraft(p);
                      }}
                      className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-sunken hover:text-ink"
                    >
                      <Pencil size={15} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      disabled={p.active}
                      title={p.active ? "Tidak bisa hapus jadwal yang sedang aktif" : "Hapus jadwal"}
                      onClick={() => setDeleteTarget(p)}
                      className="rounded-lg p-1.5 text-ink-faint hover:bg-critical-soft hover:text-critical-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {PRAYER_KEYS.map((key) => (
                    <div key={key} className="rounded-lg bg-surface-sunken px-2.5 py-2">
                      <p className="text-xs text-ink-faint">{prayerLabel(key)}</p>
                      <p className="font-semibold tabular-nums text-ink">{p[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))
      )}

      {showAdd ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-ink-soft">Jadwal baru</h2>
          <form onSubmit={createProfile} className="flex flex-col gap-3">
            <input
              value={addDraft.name}
              onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })}
              placeholder="Contoh: Jadwal Ramadan"
              className="rounded-lg border border-border bg-surface-sunken px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint"
            />
            <TimeFields draft={addDraft} onChange={setAddDraft} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setAddDraft(EMPTY_DRAFT);
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-sunken"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy || !addDraft.name.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
              >
                <Save size={14} strokeWidth={2.3} /> Simpan jadwal
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl2 border border-dashed border-border py-3.5 text-sm font-medium text-ink-soft hover:border-accent hover:text-accent"
        >
          <Plus size={16} strokeWidth={2.3} /> Tambah profil jadwal shalat
        </button>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Hapus "${deleteTarget?.name}"?`}
        description="Profil jadwal ini akan dihapus permanen."
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
