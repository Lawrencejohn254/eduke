export type TrendPoint = { label: string; value: number | null };

type Size = { W: number; H: number };
const PAD = { top: 24, right: 28, bottom: 32, left: 42 };

function Chart({ points, unit, ariaLabel, size, summary }: { points: TrendPoint[]; unit: string; ariaLabel: string; size: Size; summary: string }) {
  const { W, H } = size;
  const real = points.filter((p): p is { label: string; value: number } => p.value !== null);
  const min = Math.min(...real.map((p) => p.value));
  const max = Math.max(...real.map((p) => p.value));
  let lo = Math.max(0, Math.floor((min - 10) / 10) * 10);
  let hi = Math.min(100, Math.ceil((max + 5) / 10) * 10);
  if (hi - lo < 30) {
    lo = Math.max(0, hi - 30);
    hi = Math.min(100, lo + 30);
  }
  const span = hi - lo || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - lo) / span) * innerH;

  const step = span <= 40 ? 10 : 20;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

  // Line segments, broken at gaps so a missing month is never drawn as 0.
  const segments: string[] = [];
  let current = "";
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current) segments.push(current);
      current = "";
    } else {
      current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    }
  });
  if (current) segments.push(current);

  // Label the points directly when there's room for it; on a narrow chart with many points, rely on the axis.
  const showValues = points.length <= (W < 400 ? 4 : 6);
  const labelEvery = points.length > 6 && W < 400 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ariaLabel}: ${summary}`} className="block h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-pp-rule)" strokeWidth={1} />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-pp-muted)" className="pp-num">
            {t}
            {unit}
          </text>
        </g>
      ))}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--color-pp-green)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {points.map((p, i) =>
        p.value === null ? null : (
          <g key={p.label + i}>
            <circle cx={x(i)} cy={y(p.value)} r={4.5} fill="var(--color-pp-surface)" stroke="var(--color-pp-green)" strokeWidth={2.5}>
              <title>{`${p.label}: ${p.value}${unit}`}</title>
            </circle>
            {showValues ? (
              <text x={x(i)} y={y(p.value) - 11} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--color-pp-ink)" className="pp-num">
                {p.value}
                {unit}
              </text>
            ) : null}
          </g>
        )
      )}
      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={`l-${i}`} x={x(i)} y={H - 9} textAnchor="middle" fontSize={12} fill="var(--color-pp-muted)">
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

/**
 * Deliberately simple server-rendered line chart (no chart library, no client JS).
 * It is drawn at two native sizes — narrow and wide, chosen by the width of its own container (not the screen) — so text stays legible on both instead of
 * shrinking with the container. Only one is displayed at a time (the other is display:none, so it is
 * also hidden from assistive tech). Missing values leave a gap rather than pretending to be 0.
 */
export default function TrendChart({ points, unit = "%", ariaLabel, emptyText = "Not enough data yet." }: { points: TrendPoint[]; unit?: string; ariaLabel: string; emptyText?: string }) {
  const real = points.filter((p) => p.value !== null);
  if (real.length === 0) {
    return <p className="py-8 text-center text-[0.875rem] text-pp-muted">{emptyText}</p>;
  }
  const summary = real.map((p) => `${p.label} ${p.value}${unit}`).join(", ");
  return (
    <figure className="@container m-0">
      <div className="@lg:hidden">
        <Chart points={points} unit={unit} ariaLabel={ariaLabel} summary={summary} size={{ W: 320, H: 200 }} />
      </div>
      <div className="hidden @lg:block">
        <Chart points={points} unit={unit} ariaLabel={ariaLabel} summary={summary} size={{ W: 560, H: 220 }} />
      </div>
    </figure>
  );
}
