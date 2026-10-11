// A small bar chart (stacked when a bar has several segments). Thin bars, 2px gaps between segments, recessive gridlines,
// the selected bar labelled directly, and a legend. It's role="img" with a full text label: the table beside it carries the values.
export type Segment = { value: number; color: string };
export type Bar = { key: string; label: string; segments: Segment[]; partial?: boolean };   // partial: a period still running (drawn lighter)
export function BarChart({ id, title, bars, selected, legend, format, onSelect }: {
  id: string; title: string; bars: Bar[]; selected: number; legend: { label: string; color: string }[]; format: (v: number) => string; onSelect?: (i: number) => void;
}) {
  const W = 320, H = 140, top = 28, gap = 6, bw = (W - gap * (bars.length - 1)) / bars.length;
  const totals = bars.map((b) => b.segments.reduce((s, x) => s + x.value, 0)), max = Math.max(1, ...totals);
  // The selected total sits in a pill pointing down at its column, drawn last so no bar covers it.
  const pill = selected >= 0 && totals[selected] > 0 ? (() => {
    const label = format(totals[selected]), pw = label.length * 6 + 14, cx = selected * (bw + gap) + bw / 2;
    const px = Math.min(Math.max(cx - pw / 2, 0), W - pw), py = Math.max(0, top + H - (totals[selected] / max) * H - 26);
    return { label, pw, cx, px, py };
  })() : null;
  return (
    <figure id={id} className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H + top + 16}`} role="img" aria-label={title} className="w-full">
        {[0, 0.5, 1].map((t) => <line key={t} x1={0} x2={W} y1={top + H - t * H} y2={top + H - t * H} stroke="var(--border)" strokeWidth={1} />)}
        {bars.map((b, i) => {
          let y = top + H;
          const x = i * (bw + gap), on = i === selected;
          // When columns can be picked, the picked one gets a soft backdrop and the rest step back, so the selection reads as one.
          return (
            <g key={b.key} data-bar={b.key} onClick={onSelect ? () => onSelect(i) : undefined} className={onSelect ? "cursor-pointer" : undefined}>
              {onSelect && <rect x={x - gap / 2} y={0} width={bw + gap} height={top + H + 16} rx={4} fill={on ? "var(--muted)" : "transparent"} />}
              <g opacity={onSelect && !on ? 0.45 : 1}>
                {b.segments.filter((s) => s.value > 0).map((s, j) => {
                  const h = Math.max(1, (s.value / max) * H - 2);
                  y -= h + 2;
                  return <rect key={j} x={x} y={y + 2} width={bw} height={h} rx={2} fill={s.color} fillOpacity={b.partial ? 0.4 : 1} stroke={b.partial ? s.color : undefined} strokeWidth={b.partial ? 1.5 : undefined} />;
                })}
              </g>
              <text x={x + bw / 2} y={top + H + 12} textAnchor="middle" fontSize={8} fill={on ? "var(--foreground)" : "var(--muted-foreground)"} fontWeight={on ? 600 : 400}>{b.label}</text>
            </g>
          );
        })}
        {pill && (
          <g aria-hidden="true" data-selected-label="">
            <rect x={pill.px} y={pill.py} width={pill.pw} height={18} rx={9} fill="var(--foreground)" />
            <path d={`M${pill.cx - 4} ${pill.py + 17} L${pill.cx} ${pill.py + 22} L${pill.cx + 4} ${pill.py + 17} Z`} fill="var(--foreground)" />
            <text x={pill.px + pill.pw / 2} y={pill.py + 12.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--background)">{pill.label}</text>
          </g>
        )}
      </svg>
      <ul className="legend flex flex-wrap gap-x-4 gap-y-1 text-caption">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-sm" style={{ background: l.color }} />{l.label}</li>
        ))}
      </ul>
    </figure>
  );
}
