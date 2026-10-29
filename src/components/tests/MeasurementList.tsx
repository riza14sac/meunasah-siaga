"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { BUTTON } from "@/components/ui/styles";
import { formatClockSeconds, formatNumber } from "@/lib/format";
import type { TestMeasurement } from "@/lib/types";

const INITIAL_ROWS = 30;

export function MeasurementList({
  measurements,
  onDelete,
}: {
  measurements: TestMeasurement[];
  onDelete: (measurement: TestMeasurement) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const newestFirst = [...measurements].reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, INITIAL_ROWS);

  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">Data pengukuran</h3>
        <span className="text-xs text-ink-secondary">{measurements.length} baris</span>
      </div>

      {newestFirst.length === 0 ? (
        <p className="py-4 text-[13px] text-ink-secondary">Belum ada data. Mulai rekam atau tambah pengukuran multimeter.</p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{formatClockSeconds(m.ts)}</span>
                  <StatusPill tone={m.sumber === "esp32" ? "info" : "warning"}>
                    {m.sumber === "esp32" ? "ESP32" : "Manual"}
                  </StatusPill>
                </div>
                <p className="mt-1 text-[13px] tabular-nums text-ink">
                  {formatNumber(m.gen_voltage, 2)} V
                  {m.arus_a !== null && m.daya_w !== null
                    ? ` · ${formatNumber(m.arus_a, 3)} A · ${formatNumber(m.daya_w, 2)} W`
                    : ""}
                </p>
                {(m.beban || m.catatan) && (
                  <p className="mt-0.5 text-xs text-ink-secondary">{[m.beban, m.catatan].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDelete(m)}
                aria-label={`Hapus data pukul ${formatClockSeconds(m.ts)}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-icon hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showAll && newestFirst.length > visible.length && (
        <button type="button" onClick={() => setShowAll(true)} className={BUTTON.ghost}>
          Tampilkan semua ({newestFirst.length})
        </button>
      )}
    </Card>
  );
}
