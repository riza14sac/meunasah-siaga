"use client";

const COLOR_MAP = {
  accent: { stroke: "stroke-primary", fill: "fill-primary" },
  good: { stroke: "stroke-success", fill: "fill-success" },
  warn: { stroke: "stroke-warning", fill: "fill-warning" },
  critical: { stroke: "stroke-danger", fill: "fill-danger" },
} as const;

export function Sparkline({
  values,
  color = "accent",
  width = 112,
  height = 34,
}: {
  values: number[];
  color?: keyof typeof COLOR_MAP;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const tone = COLOR_MAP[color];
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${points[0][0].toFixed(1)},${height - pad} Z`;
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tren singkat">
      <path d={areaPath} className={tone.fill} opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" className={tone.stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={4} className={`${tone.fill} stroke-surface`} strokeWidth={2} />
    </svg>
  );
}
