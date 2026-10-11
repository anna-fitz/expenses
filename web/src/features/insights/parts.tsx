import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { C } from "@/domain/copy.js";
import type { Bucket } from "@/domain/insights";
import { cn } from "@/lib/utils";

// The pieces every Insights card is built from: a small label, one large figure, chips, rows that open, and small charts.
// Each card has one figure at hero size; everything else is a label or a row. Comparisons are marks, not sentences.

export const BUCKET_LABEL: Record<Bucket, string> = { bill: C.bills, need: C.needs, want: C.wants };
export const BUCKET_COLOR: Record<Bucket, string> = { bill: "var(--chart-1)", need: "var(--chart-2)", want: "var(--chart-3)" };

export function CardLabel({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-label uppercase tracking-wide text-muted-foreground">{children}</h2>
      {aside}
    </div>
  );
}
export function Hero({ id, value, unit }: { id?: string; value: string; unit?: string }) {
  return (
    <p className="flex items-end gap-2">
      <span id={id} className="text-display tabular-nums">{value}</span>
      {unit && <span className="pb-1 text-caption text-muted-foreground">{unit}</span>}
    </p>
  );
}
// A comparison in a pill. "warn" is kept for over pace, the one state that asks for attention; more or less than usual is neutral.
export function Chip({ id, children, tone = "plain" }: { id?: string; children: ReactNode; tone?: "plain" | "warn" }) {
  return (
    <span id={id} className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-label tabular-nums whitespace-nowrap",
      tone === "warn" ? "bg-warning-bg text-warning-fg ring-1 ring-warning-border" : "bg-muted text-foreground")}>{children}</span>
  );
}
// A row that opens. The chevron says so; the whole row is the 44px target.
export function Disclosure({ id, summary, children, className }: { id?: string; summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details id={id} className={cn("group", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );
}
// Spent so far on a track as long as a usual month (or this month, once past it), with the usual pace by today marked and labelled.
export function PaceMeter({ spent, byNow, month, label, endLabel, over }: { spent: number; byNow: number; month: number; label: string; endLabel: string; over: boolean }) {
  const track = Math.max(month, spent, 1), W = 300, x = (v: number) => (v / track) * W;
  const mark = Math.min(W - 1, Math.max(1, x(byNow))), anchor = mark < 60 ? "start" : mark > W - 60 ? "end" : "middle";
  return (
    <svg viewBox={`0 0 ${W} 48`} className="w-full overflow-visible" aria-hidden="true">
      <text x={W} y={8} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">{endLabel}</text>
      <rect x={0} y={16} width={W} height={10} rx={5} fill="var(--muted)" />
      {spent > 0 && <rect x={0} y={16} width={Math.max(10, x(Math.min(spent, month)))} height={10} rx={5} fill="var(--foreground)" />}
      {over && <rect x={x(month)} y={16} width={Math.max(4, x(spent) - x(month))} height={10} rx={5} fill="var(--warning-icon)" />}
      <rect x={mark - 1} y={11} width={2} height={20} fill="var(--muted-foreground)" />
      <text x={mark} y={44} textAnchor={anchor} fontSize={10} fill="var(--muted-foreground)">{label}</text>
    </svg>
  );
}
// A line through the last 12 months, the month shown as a dot at the end. Months without data leave a gap.
export function Sparkline({ values, label }: { values: (number | null)[]; label: string }) {
  const W = 132, H = 30, pad = 5, have = values.filter((v): v is number => v != null);
  if (have.length < 2) return null;
  const max = Math.max(...have), min = Math.min(...have), y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const x = (i: number) => pad + (i * (W - pad * 2)) / (values.length - 1);
  const runs: string[] = [];
  let cur: string[] = [];
  values.forEach((v, i) => { if (v == null) { if (cur.length) runs.push(cur.join(" ")); cur = []; } else cur.push(`${x(i)},${y(v)}`); });
  if (cur.length) runs.push(cur.join(" "));
  const last = values[values.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className="shrink-0">
      {runs.map((p) => <polyline key={p} points={p} fill="none" stroke="var(--muted-foreground)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
      {last != null && <circle cx={x(values.length - 1)} cy={y(last)} r={4} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />}
    </svg>
  );
}
// This month's bar against a tick for usual, on a scale shared by every row of the card.
export function BulletBar({ value, usual, max }: { value: number; usual: number | null; max: number }) {
  const W = 300, x = (v: number) => (v / (max || 1)) * (W - 2);
  return (
    <svg viewBox={`0 0 ${W} 14`} preserveAspectRatio="none" className="h-3.5 w-full" aria-hidden="true">
      <rect x={0} y={3} width={W} height={8} rx={4} fill="var(--muted)" />
      {value > 0 && <rect x={0} y={3} width={Math.max(8, x(value))} height={8} rx={4} fill="var(--foreground)" />}
      {usual != null && usual > 0 && <rect x={Math.min(W - 2, x(usual))} y={0} width={2} height={14} fill="var(--muted-foreground)" />}
    </svg>
  );
}
// Last year's dot to this year's, on a scale shared by every row.
export function Dumbbell({ before, now, max }: { before: number; now: number; max: number }) {
  const W = 300, pad = 6, x = (v: number) => pad + (v / (max || 1)) * (W - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} 16`} className="w-full" aria-hidden="true">
      <line x1={pad} x2={W - pad} y1={8} y2={8} stroke="var(--border)" strokeWidth={1} />
      {before > 0 && <line x1={x(before)} x2={x(now)} y1={8} y2={8} stroke="var(--muted-foreground)" strokeWidth={2} />}
      {before > 0 && <circle cx={x(before)} cy={8} r={4.5} fill="var(--muted-foreground)" />}
      <circle cx={x(now)} cy={8} r={5.5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
    </svg>
  );
}
export function Swatch({ color, round }: { color: string; round?: boolean }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0", round ? "rounded-full" : "rounded-sm")} style={{ background: color }} />;
}
