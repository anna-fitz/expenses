import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { openSheet, type Route } from "@/app/route";
import { useScreen } from "@/app/useScreen";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/data/data";
import { C, backTo, monthLabel } from "@/domain/copy.js";
import { categoryRows, figuresFor, monthOf, shiftMonth, today, usual, usualMix } from "@/domain/insights";
import { cn } from "@/lib/utils";
import { CategoryCard } from "./CategoryCard";
import { NeedsCard } from "./NeedsCard";
import { NeedsSheet } from "./NeedsSheet";
import { OnTrackCard } from "./OnTrackCard";
import { useExpensesSince, useHistory } from "./useInsightsData";
import { YearView } from "./YearView";

// One scrolling page: a month (On track, categories, where it went) or a year (against the year before, every year).
// The address says which: #/insights/2026-08 or #/insights/2026. Who paid is never shown here.
export function InsightsScreen({ route }: { route: Route }) {
  const { settings, bills } = useData(), h1 = useRef<HTMLHeadingElement>(null);
  useScreen(C.tabInsights, h1);
  const now = today(), current = monthOf(now), thisYear = Number(current.slice(0, 4)), sub = route.sub || "";
  const year = /^\d{4}$/.test(sub) && Number(sub) <= thisYear ? Number(sub) : null;
  const m = year ? (year === thisYear ? current : `${year}-12`) : /^\d{4}-\d{2}$/.test(sub) && sub <= current ? sub : current;
  // The year view compares against the year before, so it loads from then; a month needs the 13 months before it.
  const from = year ? `${year - 1}-01-01` : `${shiftMonth(m, -13)}-01`;
  const history = useHistory(), all = useExpensesSince(from), map = settings.buckets || {};
  const get = (k: string) => figuresFor(k, all ?? [], history ?? null, map);
  // The first month of the summary, or of app data (loaded back from the month shown, so going back keeps finding older months).
  const earliest = [current, ...Object.keys(history?.months || {}), ...(all || []).map((x) => monthOf(x.date))].sort()[0];
  const firstYear = Number(earliest.slice(0, 4));
  const go = (k: string | number) => { location.hash = `#/insights/${k}`; };
  const ready = history !== undefined && all !== undefined;
  // Months logged in the app can show their expenses; summary months only have totals.
  const fromApp = (k: string) => !history || k > history.through;
  const monthItems = fromApp(m) ? (all ?? []).filter((x) => monthOf(x.date) === m) : null;
  const months: string[] = [];
  for (let k = current; k >= earliest; k = shiftMonth(k, -1)) months.push(k);
  const prev = year ? year - 1 : shiftMonth(m, -1), next = year ? year + 1 : shiftMonth(m, 1);
  const atStart = year ? year <= firstYear : m <= earliest, atEnd = year ? year >= thisYear : m >= current;
  return (
    <div className="flex flex-col gap-4">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{C.tabInsights}</h1>
      <div role="group" aria-label={`${C.viewMonth} / ${C.viewYear}`} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {([[C.viewMonth, !year, () => go(m)], [C.viewYear, !!year, () => go(m.slice(0, 4))]] as const).map(([label, on, act]) => (
          <button key={label} type="button" aria-pressed={on} data-act={on ? undefined : `view-${label.toLowerCase()}`} onClick={act}
            className={cn("h-11 rounded-md text-body", on ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>{label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11" data-act="month-prev" aria-label={year ? C.prevYear : C.prevMonth} disabled={atStart} onClick={() => go(prev)}>
          <ChevronLeft className="size-5" aria-hidden="true" /></Button>
        <p id="month-label" aria-live="polite" className="flex-1 text-center text-heading">{year ?? monthLabel(m)}</p>
        <Button variant="ghost" size="icon" className="size-11" data-act="month-next" aria-label={year ? C.nextYear : C.nextMonth} disabled={atEnd} onClick={() => go(next)}>
          <ChevronRight className="size-5" aria-hidden="true" /></Button>
      </div>
      {!year && months.length > 2 && (
        <div className="flex items-center gap-2">
          <Label htmlFor="month-pick" className="shrink-0 text-caption text-muted-foreground">{C.jumpTo}</Label>
          <NativeSelect id="month-pick" className="h-11 text-body" value={m} onChange={(e) => go(e.target.value)}>
            {[...new Set(months.map((k) => k.slice(0, 4)))].map((y) => (
              <optgroup key={y} label={y}>{months.filter((k) => k.startsWith(y)).map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}</optgroup>
            ))}
          </NativeSelect>
        </div>
      )}
      {!year && m !== current && <Button variant="link" className="h-11 self-center text-body" data-act="month-now" onClick={() => go(current)}>{backTo(current)}</Button>}
      {!ready ? <Skeleton className="h-40 rounded-xl" /> : year ? (
        <YearView year={year} current={current} get={get} firstYear={firstYear} items={all ?? null} />
      ) : (
        <>
          <OnTrackCard month={m} current={m === current} day={Number(now.slice(8, 10))} f={get(m)}
            usualEvery={usual(m, get, (f) => f.everyday)} bills={bills} lastYear={get(shiftMonth(m, -12))} prev={get(shiftMonth(m, -1))}
            oneOffItems={monthItems?.filter((x) => x.oneOff && !x.billId) ?? null} />
          <CategoryCard rows={categoryRows(m, get)} items={monthItems?.filter((x) => !x.oneOff && !x.billId) ?? null} />
          <NeedsCard f={get(m)} mix={usualMix(m, get)} onOpen={() => openSheet(`#/insights/${m}/needs`)} />
          {route.id === "needs" && <NeedsSheet month={m} get={get} />}
        </>
      )}
    </div>
  );
}
