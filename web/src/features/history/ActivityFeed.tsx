import { useState } from "react";
import { SecurityNote } from "@/app/SecurityNote";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/data/activity";
import { useData } from "@/data/data";
import { C, activityLine, dayLabel, timeOf } from "@/domain/copy.js";
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
              <li key={x.id} className="act flex flex-col px-4 py-3">
                <span className="t">{activityLine(x, people.names, canon)}</span>
                <span className="s text-caption text-muted-foreground">{timeOf(x.at)}</span>
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
