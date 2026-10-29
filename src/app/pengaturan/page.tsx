"use client";

import { useEffect, useState } from "react";
import { BatteryWarning, KeyRound, Save, SunDim, type LucideIcon } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import { Card } from "@/components/ui/Card";
import { BUTTON, ICON_BOX } from "@/components/ui/styles";
import { Toast, useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/hooks";
import type { Settings } from "@/lib/types";

type Thresholds = Pick<Settings, "reserve_min" | "max_brightness">;

function SliderField({
  id,
  icon: Icon,
  iconClass,
  label,
  hint,
  value,
  max,
  onChange,
}: {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`${ICON_BOX} ${iconClass}`}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-sm font-semibold text-ink">
            {label}
          </label>
          <span className="text-lg font-bold tabular-nums text-primary">{value}%</span>
        </div>
        <p className="mb-3 text-xs leading-snug text-ink-secondary">{hint}</p>
        <input
          id={id}
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );
}

export default function PengaturanPage() {
  const { adminFetch, isAdmin, requestPin, signOut } = useAdmin();
  const { toast, showToast } = useToast();
  const [saved, setSaved] = useState<Thresholds | null>(null);
  const [draft, setDraft] = useState<Thresholds | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: Settings) => {
        const thresholds = { reserve_min: json.reserve_min, max_brightness: json.max_brightness };
        setSaved(thresholds);
        setDraft(thresholds);
      })
      .catch(() => showToast("Gagal memuat pengaturan", "critical"));
  }, [showToast]);

  const dirty =
    saved !== null && draft !== null && (saved.reserve_min !== draft.reserve_min || saved.max_brightness !== draft.max_brightness);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Gagal menyimpan"));
      const next = (await res.json()) as Settings;
      const thresholds = { reserve_min: next.reserve_min, max_brightness: next.max_brightness };
      setSaved(thresholds);
      setDraft(thresholds);
      showToast("Pengaturan tersimpan");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan", "critical");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return <p className="text-sm text-ink-secondary">Memuat pengaturan…</p>;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <Card className="flex flex-col gap-6">
        <SliderField
          id="reserve"
          icon={BatteryWarning}
          iconClass="bg-warning-soft text-warning-text"
          label="Cadangan minimum"
          hint="Di bawah nilai ini, lampu darurat diredupkan otomatis."
          value={draft.reserve_min}
          max={50}
          onChange={(reserve_min) => setDraft({ ...draft, reserve_min })}
        />
        <SliderField
          id="brightness"
          icon={SunDim}
          iconClass="bg-primary-soft text-primary"
          label="Kecerahan maksimum"
          hint="Lampu tidak pernah lebih terang dari batas ini (paling tinggi 80%)."
          value={draft.max_brightness}
          max={80}
          onChange={(max_brightness) => setDraft({ ...draft, max_brightness })}
        />
        <div className="flex justify-end border-t border-line pt-4">
          <button type="button" disabled={!dirty || saving} onClick={save} className={BUTTON.primary}>
            <Save size={18} strokeWidth={1.5} />
            {saving ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-3">
        <span className={`${ICON_BOX} bg-primary-soft text-primary`}>
          <KeyRound size={18} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Akses admin</h2>
          <p className="text-xs leading-snug text-ink-secondary">
            {isAdmin
              ? "Perangkat ini sudah bisa mengubah dan menghapus data."
              : "Siapa pun bisa melihat data. Untuk mengubah atau menghapus, masukkan PIN admin."}
          </p>
        </div>
        {isAdmin ? (
          <button type="button" onClick={() => void signOut()} className={BUTTON.secondary}>
            Keluar
          </button>
        ) : (
          <button type="button" onClick={() => void requestPin()} className={BUTTON.primary}>
            Masukkan PIN
          </button>
        )}
      </Card>

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  );
}
