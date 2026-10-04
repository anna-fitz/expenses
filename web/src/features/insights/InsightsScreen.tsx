import { useRef } from "react";
import { useScreen } from "@/app/useScreen";
import { useData } from "@/data/data";
import { C, fmt, todayISO } from "@/domain/copy.js";
import { periodStats } from "@/domain/insights";

// "This period", carried over from the current app's Profile until the Insights project fills this tab.
export function InsightsScreen() {
  const { expenses, settlements, merchants } = useData(), h1 = useRef<HTMLHeadingElement>(null);
  useScreen(C.tabInsights, h1);
  const s = periodStats(expenses, settlements, merchants, todayISO());
  const stat = (label: string, value: string, sub?: string) => (
    <div className="stat rounded-xl border bg-card p-4">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-heading tabular-nums">{value}{sub && <span className="block text-caption font-normal text-muted-foreground">{sub}</span>}</dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{C.tabInsights}</h1>
      <section aria-labelledby="stats-h" className="flex flex-col gap-3">
        <h2 id="stats-h" className="text-heading">{C.statsHeading}</h2>
        {!s ? <p id="stats-empty" className="text-muted-foreground">{C.statsEmpty}</p> : (
          <dl id="stats" className="grid grid-cols-2 gap-3">
            {stat(s.since === "settle" ? C.statDaysSettle : C.statDaysFirst, String(s.days))}
            {stat(C.statTotal, fmt(s.total))}
            {stat(C.statTop, s.top.name, `${s.top.count} expense${s.top.count === 1 ? "" : "s"}`)}
            {stat(C.statBig, fmt(s.big.amountCents), s.big.merchant)}
          </dl>
        )}
      </section>
    </div>
  );
}
