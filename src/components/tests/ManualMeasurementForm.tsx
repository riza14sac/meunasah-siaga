"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import { Card } from "@/components/ui/Card";
import { BUTTON, FIELD_LABEL, INPUT } from "@/components/ui/styles";
import { formatNumber } from "@/lib/format";
import { errorMessage } from "@/lib/hooks";
import { parseDecimal } from "@/lib/number";
import { wibClock } from "@/lib/time";

const LOADS = ["Tanpa beban", "LED 2 W", "Pengisian baterai"];
const OTHER_LOAD = "Lainnya";

export function ManualMeasurementForm({ sessionId, onSaved }: { sessionId: string; onSaved: () => void }) {
  const { adminFetch } = useAdmin();
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [load, setLoad] = useState(LOADS[0]);
  const [otherLoad, setOtherLoad] = useState("");
  const [time, setTime] = useState(() => wibClock(Date.now()));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const v = parseDecimal(voltage);
  const a = parseDecimal(current);
  const power = v !== null && a !== null && !Number.isNaN(v) && !Number.isNaN(a) ? v * a : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v === null || Number.isNaN(v)) {
      setError("Isi tegangan dalam volt, contoh 11,8");
      return;
    }
    if (Number.isNaN(a)) {
      setError("Arus harus berupa angka dalam ampere, contoh 0,30");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/test-sessions/${sessionId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gen_voltage: v,
          arus_a: a,
          beban: load === OTHER_LOAD ? otherLoad : load,
          catatan: note,
          waktu: time,
        }),
      });
      if (!res.ok) {
        setError(await errorMessage(res, "Gagal menyimpan pengukuran"));
        return;
      }
      setVoltage("");
      setCurrent("");
      setNote("");
      setTime(wibClock(Date.now()));
      onSaved();
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-ink">Tambah pengukuran multimeter</h3>
      <p className="mt-1 text-[13px] leading-snug text-ink-secondary">Daya dihitung otomatis dari tegangan × arus.</p>
      <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
        <label className={FIELD_LABEL}>
          Tegangan (V)
          <input
            required
            inputMode="decimal"
            placeholder="11,8"
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
            className={INPUT}
          />
        </label>
        <label className={FIELD_LABEL}>
          Arus (A, opsional)
          <input inputMode="decimal" placeholder="0,30" value={current} onChange={(e) => setCurrent(e.target.value)} className={INPUT} />
        </label>
        <label className={`${FIELD_LABEL} col-span-2`}>
          Beban
          <select value={load} onChange={(e) => setLoad(e.target.value)} className={INPUT}>
            {[...LOADS, OTHER_LOAD].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        {load === OTHER_LOAD && (
          <label className={`${FIELD_LABEL} col-span-2`}>
            Beban lainnya
            <input maxLength={60} value={otherLoad} onChange={(e) => setOtherLoad(e.target.value)} className={INPUT} />
          </label>
        )}
        <label className={FIELD_LABEL}>
          Waktu (WIB)
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={INPUT} />
        </label>
        <div className={FIELD_LABEL}>
          Daya
          <p className="rounded-sm bg-surface-muted px-3 py-2.5 text-sm font-semibold tabular-nums text-ink">
            {power === null ? "–" : `${formatNumber(power, 2)} W`}
          </p>
        </div>
        <label className={`${FIELD_LABEL} col-span-2`}>
          Catatan
          <input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} />
        </label>
        {error && (
          <p role="alert" className="col-span-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !voltage.trim()} className={`${BUTTON.primary} col-span-2`}>
          <Plus size={18} strokeWidth={1.5} />
          {busy ? "Menyimpan…" : "Simpan pengukuran"}
        </button>
      </form>
    </Card>
  );
}
