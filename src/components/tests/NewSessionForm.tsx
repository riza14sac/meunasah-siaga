"use client";

import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Card } from "@/components/ui/Card";
import { BUTTON, FIELD_LABEL, INPUT } from "@/components/ui/styles";
import { errorMessage } from "@/lib/hooks";
import { parseDecimal } from "@/lib/number";
import { wibDateKey } from "@/lib/time";
import type { TestSession } from "@/lib/types";

export function NewSessionForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const { adminFetch } = useAdmin();
  const [form, setForm] = useState({
    judul: "",
    tanggal: wibDateKey(Date.now()),
    lokasi: "",
    kondisi: "",
    tekanan: "",
    debit: "",
    catatan: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const tekanan = parseDecimal(form.tekanan);
    const debit = parseDecimal(form.debit);
    if (Number.isNaN(tekanan) || Number.isNaN(debit)) {
      setError("Tekanan dan debit harus berupa angka, contoh 0,8");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/test-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: form.judul,
          tanggal: form.tanggal,
          lokasi: form.lokasi,
          kondisi: form.kondisi,
          catatan: form.catatan,
          tekanan_bar: tekanan,
          debit_lpm: debit,
        }),
      });
      if (!res.ok) {
        setError(await errorMessage(res, "Gagal membuat sesi"));
        return;
      }
      onCreated(((await res.json()) as TestSession).id);
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-ink">Sesi pengujian baru</h3>
      <p className="mt-1 text-[13px] leading-snug text-ink-secondary">
        Setelah sesi dibuat, tekan Mulai rekam saat kran dibuka agar data ESP32 masuk ke sesi ini.
      </p>
      <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
        <label className={`${FIELD_LABEL} col-span-2`}>
          Judul sesi
          <input required maxLength={80} placeholder="Contoh: Uji turbin, kran dibuka penuh" className={INPUT} {...bind("judul")} />
        </label>
        <label className={FIELD_LABEL}>
          Tanggal
          <input type="date" required className={INPUT} {...bind("tanggal")} />
        </label>
        <label className={FIELD_LABEL}>
          Lokasi
          <input maxLength={80} placeholder="Musholla Al-Walidaini" className={INPUT} {...bind("lokasi")} />
        </label>
        <label className={`${FIELD_LABEL} col-span-2`}>
          Kondisi
          <input maxLength={120} placeholder="Contoh: kran wudhu dibuka penuh" className={INPUT} {...bind("kondisi")} />
        </label>
        <label className={FIELD_LABEL}>
          Tekanan (bar, opsional)
          <input inputMode="decimal" placeholder="0,8" className={INPUT} {...bind("tekanan")} />
        </label>
        <label className={FIELD_LABEL}>
          Debit (L/menit, opsional)
          <input inputMode="decimal" placeholder="18,6" className={INPUT} {...bind("debit")} />
        </label>
        <label className={`${FIELD_LABEL} col-span-2`}>
          Catatan
          <textarea rows={2} maxLength={500} className={INPUT} {...bind("catatan")} />
        </label>
        {error && (
          <p role="alert" className="col-span-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className={BUTTON.secondary}>
            Batal
          </button>
          <button type="submit" disabled={busy || !form.judul.trim()} className={BUTTON.primary}>
            {busy ? "Menyimpan…" : "Buat sesi"}
          </button>
        </div>
      </form>
    </Card>
  );
}
