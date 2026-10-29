"use client";

import { useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/format";
import { prayerLabel, prayerShortLabel } from "@/lib/prayer";
import type { PrayerKey, ReadingPoint } from "@/lib/types";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const HEIGHT = 230;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 44;
/** Labels closer than this drop to a second row (Maghrib and Isya are only ~70 minutes apart). */
const LABEL_GAP = 46;

interface PrayerMark {
  key: PrayerKey;
  atMs: number;
}

export function TrendChart({ points, prayerMarks }: { points: ReadingPoint[]; prayerMarks: PrayerMark[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = useMeasuredWidth(wrapRef, 320);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (points.length < 2) return null;

    const xs = points.map((p) => Date.parse(p.ts));
    const ys = points.map((p) => p.bat_percent);
    const xMin = xs[0];
    const xMax = xs[xs.length - 1];
    const xSpan = xMax - xMin || 1;
    const innerW = width - PAD_L - PAD_R;
    const innerH = HEIGHT - PAD_T - PAD_B;

    const toX = (t: number) => PAD_L + ((t - xMin) / xSpan) * innerW;
    const toY = (v: number) => PAD_T + (1 - v / 100) * innerH;

    const coords = xs.map((t, i) => [toX(t), toY(ys[i])] as const);
    const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${PAD_T + innerH} L${coords[0][0].toFixed(1)},${PAD_T + innerH} Z`;

    const short = width < 640;
    let lastX = -Infinity;
    let lastRow = 1;
    const marks = prayerMarks
      .filter((m) => m.atMs >= xMin && m.atMs <= xMax)
      .sort((a, b) => a.atMs - b.atMs)
      .map((m) => {
        const x = toX(m.atMs);
        const row = x - lastX < LABEL_GAP ? 1 - lastRow : 0;
        lastX = x;
        lastRow = row;
        return { ...m, x, row, label: short ? prayerShortLabel(m.key) : prayerLabel(m.key) };
      });

    return { coords, linePath, areaPath, toY, innerH, marks };
  }, [points, prayerMarks, width]);

  function handleMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !plot) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let nearestDist = Infinity;
    plot.coords.forEach(([x], i) => {
      const d = Math.abs(x - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  const hover = plot && hoverIdx !== null ? points[hoverIdx] : null;
  const hoverPoint = plot && hoverIdx !== null ? plot.coords[hoverIdx] : null;
  const values = points.map((p) => p.bat_percent);

  return (
    <div ref={wrapRef} className="relative">
      {!plot ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-ink-secondary">Menunggu cukup data untuk grafik…</div>
      ) : (
        <>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width="100%"
            height={HEIGHT}
            style={{ touchAction: "pan-y" }}
            role="img"
            aria-label="Grafik baterai sepanjang hari, ditandai lima waktu shalat"
            onPointerMove={(e) => handleMove(e.clientX)}
            onPointerLeave={() => setHoverIdx(null)}
          >
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line x1={PAD_L} x2={width - PAD_R} y1={plot.toY(v)} y2={plot.toY(v)} className="stroke-line" strokeWidth={1} />
                <text x={PAD_L - 8} y={plot.toY(v)} textAnchor="end" dominantBaseline="middle" className="fill-ink-secondary text-[11px]">
                  {v}
                </text>
              </g>
            ))}

            {plot.marks.map((m) => (
              <g key={m.key + m.atMs}>
                <line x1={m.x} x2={m.x} y1={PAD_T} y2={PAD_T + plot.innerH} className="stroke-line" strokeWidth={1} strokeDasharray="3 3" />
                <text
                  x={m.x}
                  y={HEIGHT - PAD_B + 16 + m.row * 14}
                  textAnchor="middle"
                  className="fill-ink-secondary text-[11px] font-medium"
                >
                  {m.label}
                </text>
              </g>
            ))}

            <path d={plot.areaPath} className="fill-primary" opacity={0.14} stroke="none" />
            <path d={plot.linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {hoverPoint && (
              <>
                <line x1={hoverPoint[0]} x2={hoverPoint[0]} y1={PAD_T} y2={PAD_T + plot.innerH} className="stroke-primary" opacity={0.45} strokeWidth={1.5} />
                <circle cx={hoverPoint[0]} cy={hoverPoint[1]} r={5} className="fill-primary stroke-surface" strokeWidth={2} />
              </>
            )}
          </svg>

          {hover && hoverPoint && (
            <div
              className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1.5 text-xs text-white shadow-card"
              style={{ left: `${Math.min(88, Math.max(12, (hoverPoint[0] / width) * 100))}%` }}
            >
              <div className="font-semibold tabular-nums">{hover.bat_percent.toFixed(1)}%</div>
              <div className="text-[10px] text-ink-muted">{formatClock(hover.ts)}</div>
            </div>
          )}

          <span className="sr-only">
            Baterai berkisar dari {Math.min(...values).toFixed(0)}% sampai {Math.max(...values).toFixed(0)}% pada rentang yang
            ditampilkan, nilai terbaru {values[values.length - 1].toFixed(1)}%.
          </span>
        </>
      )}
    </div>
  );
}
