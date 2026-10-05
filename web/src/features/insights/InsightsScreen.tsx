import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { openSheet, type Route } from "@/app/route";
import { useScreen } from "@/app/useScreen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/data/data";
import { C, monthLabel } from "@/domain/copy.js";
import { figuresFor, monthOf, shiftMonth, today, usual, usualMix } from "@/domain/insights";
import { NeedsCard } from "./NeedsCard";
import { NeedsSheet } from "./NeedsSheet";
import { OnTrackCard } from "./OnTrackCard";
import { useExpensesSince, useHistory } from "./useInsightsData";

// One scrolling page: the month, then On track, then Needs vs. wants. Who paid is never shown here.
export function InsightsScreen({ route }: { route: Route }) {
  const { settings } = useData(), h1 = useRef<HTMLHeadingElement>(null);
  useScreen(C.tabInsights, h1);
  const now = today(), current = monthOf(now);
  const m = /^\d{4}-\d{2}$/.test(route.sub || "") && (route.sub as string) <= current ? (route.sub as string) : current;
  const history = useHistory(), all = useExpensesSince(`${shiftMonth(m, -13)}-01`), map = settings.buckets || {};
  const get = (k: string) => figuresFor(k, all ?? [], history ?? null, map);
  // The first month of the summary, or of app data (loaded 13 months back from the month shown, so going back keeps finding older months).
  const earliest = [current, ...Object.keys(history?.months || {}), ...(all || []).map((x) => monthOf(x.date))].sort()[0];
  const go = (k: string) => { location.hash = `#/insights/${k}`; };
  const ready = history !== undefined && all !== undefined;
  return (
    <div className="flex flex-col gap-4">
      <h1 id="screen-title" ref={h1} tabIndex={-1} className="text-title outline-none">{C.tabInsights}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-11" data-act="month-prev" aria-label={C.prevMonth} disabled={m <= earliest} onClick={() => go(shiftMonth(m, -1))}>
          <ChevronLeft className="size-5" aria-hidden="true" /></Button>
        <p id="month-label" aria-live="polite" className="flex-1 text-center text-heading">{monthLabel(m)}</p>
        <Button variant="ghost" size="icon" className="size-11" data-act="month-next" aria-label={C.nextMonth} disabled={m >= current} onClick={() => go(shiftMonth(m, 1))}>
          <ChevronRight className="size-5" aria-hidden="true" /></Button>
      </div>
      {m !== current && <Button variant="link" className="h-11 self-center text-body" data-act="month-now" onClick={() => go(current)}>{C.thisMonth}</Button>}
      {!ready ? <Skeleton className="h-40 rounded-xl" /> : (
        <>
          <OnTrackCard month={m} current={m === current} day={Number(now.slice(8, 10))} f={get(m)}
            usualEvery={usual(m, get, (f) => f.everyday)} usualBills={usual(m, get, (f) => f.bills)} />
          <NeedsCard f={get(m)} mix={usualMix(m, get)} onOpen={() => openSheet(`#/insights/${m}/needs`)} />
          {route.id === "needs" && <NeedsSheet month={m} get={get} />}
        </>
      )}
    </div>
  );
}
