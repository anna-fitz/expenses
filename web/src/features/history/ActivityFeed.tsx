import { useState } from "react";
import { SecurityNote } from "@/app/SecurityNote";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/data/activity";
import { useData } from "@/data/data";
import { ChevronRight } from "lucide-react";
import { openSheet } from "@/app/route";
import { C, activityDetail, activityLine, dayLabel, timeOf } from "@/domain/copy.js";
import { groupByDay } from "@/domain/money";
import { canonicalName } from "@/domain/stores.js";

export function ActivityFeed() {
  const { people, merchants } = useData(), [max, setMax] = useState(100), act = useActivity(max);
  const canon = (n: string) => canonicalName(merchants, n);
  let body;
  if (act.error) body = <p role="alert" className="text-caption text-destructive">{C.activityError}</p>;
  else if (!act.loaded) body = <Skeleton className="h-32 rounded-xl" />;
  else if (!act.list.length) body = (
    <Empty className="rounded-xl border border-dashed"><EmptyHeader><EmptyDescription>{C.emptyActivity}</EmptyDescription></EmptyHeader></Empty>
  );
  else body = (
    <>
      {groupByDay(act.list).map(([day, list]) => (
        <section key={day} className="flex flex-col gap-1.5">
          <h2 className="text-label text-muted-foreground">{dayLabel(day)}</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {list.map((x) => (
              <li key={x.id} className="act">
                {(() => {
                  const detail = activityDetail(x, people.names, people.me);
                  const inner = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="t block">{activityLine(x, people.names, canon, people.me)}</span>
                        {detail && <span className="d block text-caption">{detail}</span>}
                        <span className="s block text-caption text-muted-foreground">{timeOf(x.at)}</span>
                      </span>
                      {x.expenseId && x.action !== "delete" && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    </>
                  );
                  // Entries about an expense open it read-only; a deleted one has nothing left to open.
                  return x.expenseId && x.action !== "delete"
                    ? <button type="button" data-act="act-open" data-id={x.expenseId} onClick={() => openSheet(`#/history/view/${encodeURIComponent(x.expenseId!)}`)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left outline-offset-[-2px] active:bg-muted">{inner}</button>
                    : <div className="flex items-center gap-3 px-4 py-3">{inner}</div>;
                })()}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {act.list.length >= max && (
        <Button variant="outline" className="h-11 w-full text-body" data-act="more-activity" onClick={() => setMax(max + 100)}>{C.showMore}</Button>
      )}
    </>
  );
  return <div className="flex flex-col gap-4"><SecurityNote id="activity-note">{C.activityNote}</SecurityNote>{body}</div>;
}
