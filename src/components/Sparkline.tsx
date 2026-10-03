// ── Shared tiny SVG sparkline (no deps) ────────────────────────────────
export function Sparkline({ points, width = 260, height = 64, color = '#f97316' }: { points: [number, number][]; width?: number; height?: number; color?: string }) {
  if (!points || points.length < 2) return <div style={{ height }} />;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const d = points.map((p, i) => {
    const x = ((p[0] - minX) / (maxX - minX || 1)) * width;
    const y = height - ((p[1] - minY) / spanY) * height;
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
