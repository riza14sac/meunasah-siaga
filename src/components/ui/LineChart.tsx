"use client";

import { useId, useMemo, useRef, useState } from "react";
import { formatClock, formatNumber } from "@/lib/format";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

type Tone = "primary" | "warning" | "info" | "purple";

const TONES: Record<Tone, { stroke: string; fill: string; text: string; dot: string }> = {
  primary: { stroke: "stroke-primary", fill: "fill-primary", text: "text-primary", dot: "bg-primary" },
  warning: { stroke: "stroke-warning", fill: "fill-warning", text: "text-warning", dot: "bg-warning" },
  info: { stroke: "stroke-info-text", fill: "fill-info-text", text: "text-info-text", dot: "bg-info-text" },
  purple: { stroke: "stroke-purple-text", fill: "fill-purple-text", text: "text-purple-text", dot: "bg-purple-text" },
};

export interface ChartPoint {
  t: number;
  v: number;
}

export interface ChartSeries {
  label: string;
  tone: Tone;
  /** "line" for a continuous sensor stream, "dots" for sparse hand-entered values. */
  style: "line" | "dots";
  points: ChartPoint[];
}

const HEIGHT = 210;
const PAD = { l: 44, r: 12, t: 14, b: 26 };
/** Lines break where readings are further apart than this (device silent or recording paused). */
const GAP_MS = 120_000;

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (v <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

function nearest(points: ChartPoint[], t: number): ChartPoint | null {
  let best: ChartPoint | null = null;
  for (const p of points) if (best === null || Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  return best;
}

export function LineChart({
  series,
  unit,
  label,
  digits = 1,
  formatTime = formatClock,
}: {
  series: ChartSeries[];
  unit: string;
  label: string;
  digits?: number;
  formatTime?: (ms: number) => string;
}) {
  const gradientId = `area-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = useMeasuredWidth(wrapRef, 320);
  const [hoverT, setHoverT] = useState<number | null>(null);

  const plot = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (all.length === 0) return null;

    let tMin = Math.min(...all.map((p) => p.t));
    let tMax = Math.max(...all.map((p) => p.t));
    if (tMax - tMin < 60_000) {
      tMin -= 30_000;
      tMax += 30_000;
    }
    const vMax = niceCeil(Math.max(...all.map((p) => p.v)) * 1.1);
    const innerW = width - PAD.l - PAD.r;
    const innerH = HEIGHT - PAD.t - PAD.b;
    const x = (t: number) => PAD.l + ((t - tMin) / (tMax - tMin)) * innerW;
    const y = (v: number) => PAD.t + (1 - v / vMax) * innerH;
    const baseY = PAD.t + innerH;

    const shapes = series.map((s) => {
      const pts = [...s.points].sort((a, b) => a.t - b.t);
      const segments: ChartPoint[][] = [];
      for (const p of pts) {
        const current = segments[segments.length - 1];
        if (current && p.t - current[current.length - 1].t <= GAP_MS) current.push(p);
        else segments.push([p]);
      }
      const coords = (seg: ChartPoint[]) => seg.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
      const line = segments.map((seg) => `M${coords(seg).join(" L")}`).join(" ");
      const area = segments
        .filter((seg) => seg.length > 1)
        .map((seg) => `M${x(seg[0].t).toFixed(1)},${baseY} L${coords(seg).join(" L")} L${x(seg[seg.length - 1].t).toFixed(1)},${baseY} Z`)
        .join(" ");
      return { ...s, pts, line, area };
    });

    return { tMin, tMax, vMax, x, y, innerW, shapes, values: all.map((p) => p.v) };
  }, [series, width]);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !plot) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const t = plot.tMin + ((px - PAD.l) / plot.innerW) * (plot.tMax - plot.tMin);
    setHoverT(Math.min(plot.tMax, Math.max(plot.tMin, t)));
  }

  const firstLine = plot?.shapes.find((s) => s.style === "line" && s.pts.length > 0);
  const lastPoint = firstLine?.pts[firstLine.pts.length - 1];
  const hovered =
    !plot || hoverT === null
      ? []
      : plot.shapes.flatMap((s) => {
          const p = nearest(s.pts, hoverT);
          return p ? [{ series: s, point: p }] : [];
        });
  const anchor = hovered.reduce<ChartPoint | null>(
    (best, h) => (best === null || Math.abs(h.point.t - hoverT!) < Math.abs(best.t - hoverT!) ? h.point : best),
    null
  );

  return (
    <div ref={wrapRef} className="relative">
      {!plot ? (
        <div className="flex h-40 items-center justify-center text-[13px] text-ink-secondary">Belum ada data</div>
      ) : (
        <>
          {series.length > 1 && (
            <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
              {series.map((s) => (
                <li key={s.label} className="flex items-center gap-1.5">
                  <span
                    className={
                      s.style === "line"
                        ? `h-0.5 w-4 rounded-full ${TONES[s.tone].dot}`
                        : `h-2.5 w-2.5 rounded-full border-2 border-current ${TONES[s.tone].text}`
                    }
                    aria-hidden="true"
                  />
                  {s.label}
                </li>
              ))}
            </ul>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width="100%"
            height={HEIGHT}
            style={{ touchAction: "pan-y" }}
            role="img"
            aria-label={label}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHoverT(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} className={TONES[firstLine?.tone ?? "primary"].text} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} className={TONES[firstLine?.tone ?? "primary"].text} />
              </linearGradient>
            </defs>

            {[0, plot.vMax / 2, plot.vMax].map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={width - PAD.r} y1={plot.y(v)} y2={plot.y(v)} className="stroke-line" strokeWidth={1} />
                <text x={PAD.l - 8} y={plot.y(v)} textAnchor="end" dominantBaseline="middle" className="fill-ink-secondary text-[11px]">
                  {formatNumber(v, 2)}
                  {v === plot.vMax ? ` ${unit}` : ""}
                </text>
              </g>
            ))}
            {[plot.tMin, (plot.tMin + plot.tMax) / 2, plot.tMax].map((t, i) => (
              <text
                key={t}
                x={plot.x(t)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                className="fill-ink-secondary text-[11px]"
              >
                {formatTime(t)}
              </text>
            ))}

            {firstLine && firstLine.area && <path d={firstLine.area} fill={`url(#${gradientId})`} stroke="none" />}
            {plot.shapes
              .filter((s) => s.style === "line")
              .map((s) => (
                <path
                  key={s.label}
                  d={s.line}
                  fill="none"
                  className={TONES[s.tone].stroke}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            {plot.shapes
              .filter((s) => s.style === "dots")
              .flatMap((s) =>
                s.pts.map((p) => (
                  <circle
                    key={`${s.label}-${p.t}-${p.v}`}
                    cx={plot.x(p.t)}
                    cy={plot.y(p.v)}
                    r={4.5}
                    className={`fill-surface ${TONES[s.tone].stroke}`}
                    strokeWidth={2.5}
                  />
                ))
              )}
            {lastPoint && firstLine && (
              <circle
                cx={plot.x(lastPoint.t)}
                cy={plot.y(lastPoint.v)}
                r={5}
                className={`fill-surface ${TONES[firstLine.tone].stroke}`}
                strokeWidth={2.5}
              />
            )}

            {anchor && (
              <>
                <line
                  x1={plot.x(anchor.t)}
                  x2={plot.x(anchor.t)}
                  y1={PAD.t}
                  y2={plot.y(0)}
                  className="stroke-ink-muted"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {hovered.map(({ series: s, point }) => (
                  <circle
                    key={s.label}
                    cx={plot.x(point.t)}
                    cy={plot.y(point.v)}
                    r={5}
                    className={`${TONES[s.tone].fill} stroke-surface`}
                    strokeWidth={2}
                  />
                ))}
              </>
            )}
          </svg>

          {anchor && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1.5 text-xs text-white shadow-card"
              style={{ left: `${Math.min(85, Math.max(15, (plot.x(anchor.t) / width) * 100))}%` }}
            >
              <div className="text-[11px] text-ink-muted">{formatTime(anchor.t)}</div>
              {hovered.map(({ series: s, point }) => (
                <div key={s.label} className="font-semibold tabular-nums">
                  {series.length > 1 ? `${s.label}: ` : ""}
                  {formatNumber(point.v, digits)} {unit}
                </div>
              ))}
            </div>
          )}

          <p className="sr-only">
            {label}: nilai antara {formatNumber(Math.min(...plot.values), digits)} dan{" "}
            {formatNumber(Math.max(...plot.values), digits)} {unit}.
          </p>
        </>
      )}
    </div>
  );
}
