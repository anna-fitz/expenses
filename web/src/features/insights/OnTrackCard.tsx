import { Clock, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Bill, Expense } from "@/data/types";
import { C, billsIn, fmt, lastYearLine, oneOffsLine, onTrackLine, paceLine, pastBills, pastLine, pastOneOffs } from "@/domain/copy.js";
import { EMPTY, daysIn, pace, type Figures } from "@/domain/insights";
import { cn } from "@/lib/utils";
import { BillsDetail } from "./BillsDetail";
import { OneOffs } from "./OneOffs";

// The headline: everyday spending against your usual pace (bills and one-offs shown, not judged).
// `lastYear` is the same month a year earlier, when there's data for it: "usual" can't see seasons, this can.
export function OnTrackCard({ month, current, day, f, usualEvery, bills, lastYear, prev, oneOffItems }: {
  month: string; current: boolean; day: number; f: Figures | null; usualEvery: number | null; bills: Bill[]; lastYear: Figures | null; prev: Figures | null; oneOffItems: Expense[] | null;
}) {
  const how = (
    <details id="usual-how" className="text-caption text-muted-foreground">
      <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">{C.howUsual}</summary>
      <p>{C.usualExplained}</p>
    </details>
  );
  const ly = lastYear && <p id="ontrack-lastyear" className="text-caption">{lastYearLine(month.replace(/^\d+/, (y) => String(+y - 1)), fmt(lastYear.everyday))}</p>;
  if (!current && !f) return <section id="ontrack" className="rounded-xl border bg-card p-4"><p id="ontrack-line">{C.noMonth}</p>{how}</section>;
  const x = f || EMPTY;
  if (usualEvery == null) return <section id="ontrack" className="flex flex-col gap-1 rounded-xl border bg-card p-4"><p id="ontrack-line">{C.notEnough}</p>{ly}{how}</section>;
  if (!current) {
    const pct = Math.round(((x.everyday - usualEvery) / usualEvery) * 100);
    return (
      <section id="ontrack" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
        <p id="ontrack-line" className="font-medium">{pastLine(fmt(x.everyday), fmt(usualEvery), pct)}</p>
        {ly}
        <BillsDetail line={pastBills(fmt(x.bills))} month={month} current={false} f={x} prev={prev} lastYear={lastYear} bills={bills} className="text-caption text-muted-foreground" />
        <OneOffs f={x} items={oneOffItems} line={pastOneOffs(x.oneOffs ? fmt(x.oneOffs) : null)} className="text-caption text-muted-foreground" />
        {how}
      </section>
    );
  }
  const p = pace(x.everyday, usualEvery, day, daysIn(month));
  const word = { early: C.earlyDays, on: C.onTrack, high: C.runningHigh, low: C.runningLow }[p.status];
  const Icon = { early: Clock, on: Minus, high: TrendingUp, low: TrendingDown }[p.status];
  // The track is a usual month, or this month once it's gone past that, so going over shows.
  const track = Math.max(usualEvery, x.everyday, 1), fill = (x.everyday / track) * 100, mark = (p.byNow / track) * 100;
  const active = bills.filter((b) => b.active !== false).sort((a, b) => a.order - b.order), got = active.filter((b) => (x.billsBy[b.id] || 0) > 0);
  return (
    <section id="ontrack" className={cn("flex flex-col gap-2 rounded-xl border p-4", p.status === "high" ? "border-warning-border bg-warning-bg text-warning-fg" : "bg-card")}>
      <p className="flex items-center gap-2 text-heading">
        <Icon className={cn("size-5", p.status === "high" && "text-warning-icon")} aria-hidden="true" /><span id="ontrack-status">{word}</span>
        <span className="text-caption font-normal text-muted-foreground">· {C.everyday}</span>
      </p>
      <p id="ontrack-line" className="tabular-nums">{paceLine(p.status, fmt(x.everyday), fmt(Math.abs(x.everyday - p.byNow)), day)}</p>
      <div role="img" aria-label={onTrackLine(fmt(x.everyday), fmt(p.byNow))} className="relative h-2 rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: `${fill}%` }} />
        <span aria-hidden="true" className="absolute -top-1 h-4 w-0.5 bg-muted-foreground" style={{ left: `${mark}%` }} />
      </div>
      {ly}
      <BillsDetail line={billsIn(got.length, active.length, active.filter((b) => !got.includes(b)).map((b) => b.name), fmt(x.bills))} month={month} current f={x} prev={prev} lastYear={lastYear} bills={bills} className="text-caption" />
      {x.oneOffs > 0 && <OneOffs f={x} items={oneOffItems} line={oneOffsLine(fmt(x.oneOffs), x.oneOffCount)} className="text-caption" />}
      {how}
    </section>
  );
}
