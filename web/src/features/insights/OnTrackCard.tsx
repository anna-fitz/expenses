import { Clock, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { C, billsSoFar, fmt, monthLabel, oneOffsLine, onTrackLine, pastBills, pastLine, pastOneOffs } from "@/domain/copy.js";
import { EMPTY, daysIn, pace, type Figures } from "@/domain/insights";
import { cn } from "@/lib/utils";

// The headline: everyday spending against your usual pace (bills and one-offs shown, not judged).
export function OnTrackCard({ month, current, day, f, usualEvery, usualBills }: {
  month: string; current: boolean; day: number; f: Figures | null; usualEvery: number | null; usualBills: number | null;
}) {
  const how = (
    <details id="usual-how" className="text-caption text-muted-foreground">
      <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">{C.howUsual}</summary>
      <p>{C.usualExplained}</p>
    </details>
  );
  if (!current && !f) return <section id="ontrack" className="rounded-xl border bg-card p-4"><p id="ontrack-line">{C.noMonth}</p>{how}</section>;
  const x = f || EMPTY;
  if (usualEvery == null) return <section id="ontrack" className="rounded-xl border bg-card p-4"><p id="ontrack-line">{C.notEnough}</p>{how}</section>;
  if (!current) {
    const pct = Math.round(((x.everyday - usualEvery) / usualEvery) * 100);
    return (
      <section id="ontrack" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
        <p id="ontrack-line" className="font-medium">{pastLine(monthLabel(month), fmt(x.everyday), fmt(usualEvery), pct)}</p>
        <p id="ontrack-bills" className="text-caption text-muted-foreground">{pastBills(fmt(x.bills))}</p>
        <p id="ontrack-oneoffs" className="text-caption text-muted-foreground">{pastOneOffs(x.oneOffs ? fmt(x.oneOffs) : null)}</p>
        {how}
      </section>
    );
  }
  const p = pace(x.everyday, usualEvery, day, daysIn(month));
  const word = { early: C.earlyDays, on: C.onTrack, high: C.runningHigh, low: C.runningLow }[p.status];
  const Icon = { early: Clock, on: Minus, high: TrendingUp, low: TrendingDown }[p.status];
  const fill = Math.min(100, usualEvery ? (x.everyday / usualEvery) * 100 : 0), mark = (day / daysIn(month)) * 100;
  return (
    <section id="ontrack" className={cn("flex flex-col gap-2 rounded-xl border p-4", p.status === "high" ? "border-warning-border bg-warning-bg text-warning-fg" : "bg-card")}>
      <p className="flex items-center gap-2 text-heading">
        <Icon className={cn("size-5", p.status === "high" && "text-warning-icon")} aria-hidden="true" /><span id="ontrack-status">{word}</span>
        <span className="text-caption font-normal text-muted-foreground">· {C.everyday}</span>
      </p>
      <p id="ontrack-line" className="tabular-nums">{onTrackLine(fmt(x.everyday), fmt(p.byNow))}</p>
      <div role="img" aria-label={onTrackLine(fmt(x.everyday), fmt(p.byNow))} className="relative h-2 rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: `${fill}%` }} />
        <span aria-hidden="true" className="absolute -top-1 h-4 w-0.5 bg-muted-foreground" style={{ left: `${mark}%` }} />
      </div>
      <p id="ontrack-bills" className="text-caption">{billsSoFar(fmt(x.bills), usualBills == null ? null : fmt(usualBills))}</p>
      {x.oneOffs > 0 && <p id="ontrack-oneoffs" className="text-caption">{oneOffsLine(fmt(x.oneOffs), x.oneOffCount)}</p>}
      {how}
    </section>
  );
}
