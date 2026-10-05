// A small bar chart (stacked when a bar has several segments). Thin bars, 2px gaps between segments, recessive gridlines,
// the selected bar labelled directly, and a legend. It's role="img" with a full text label: the table beside it carries the values.
export type Segment = { value: number; color: string };
export type Bar = { key: string; label: string; segments: Segment[] };
export function BarChart({ id, title, bars, selected, legend, format }: {
  id: string; title: string; bars: Bar[]; selected: number; legend: { label: string; color: string }[]; format: (v: number) => string;
}) {
  const W = 320, H = 140, top = 18, gap = 6, bw = (W - gap * (bars.length - 1)) / bars.length;
  const totals = bars.map((b) => b.segments.reduce((s, x) => s + x.value, 0)), max = Math.max(1, ...totals);
  return (
    <figure id={id} className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H + top + 16}`} role="img" aria-label={title} className="w-full">
        {[0, 0.5, 1].map((t) => <line key={t} x1={0} x2={W} y1={top + H - t * H} y2={top + H - t * H} stroke="var(--border)" strokeWidth={1} />)}
        {bars.map((b, i) => {
          let y = top + H;
          const x = i * (bw + gap);
          return (
            <g key={b.key}>
              {b.segments.filter((s) => s.value > 0).map((s, j) => {
                const h = Math.max(1, (s.value / max) * H - 2);
                y -= h + 2;
                return <rect key={j} x={x} y={y + 2} width={bw} height={h} rx={2} fill={s.color} />;
              })}
              <text x={x + bw / 2} y={top + H + 12} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">{b.label.slice(0, 1)}</text>
              {i === selected && totals[i] > 0 && (
                <text x={Math.min(Math.max(x + bw / 2, 24), W - 24)} y={Math.max(10, top + H - (totals[i] / max) * H - 4)} textAnchor="middle" fontSize={10} fill="var(--foreground)">{format(totals[i])}</text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="legend flex flex-wrap gap-x-4 gap-y-1 text-caption">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-sm" style={{ background: l.color }} />{l.label}</li>
        ))}
      </ul>
    </figure>
  );
}
