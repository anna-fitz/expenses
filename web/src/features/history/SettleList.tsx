import { ChevronRight } from "lucide-react";
import { openSheet } from "@/app/route";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useData } from "@/data/data";
import { C, fmt, settleRowDate, settleRowSub } from "@/domain/copy.js";

// Settle-ups, newest first, under a heading for each year. The date leads; the amount sits on the right.
export function SettleList() {
  const { settlements, people } = useData();
  if (!settlements.length) return (
    <Empty className="rounded-xl border border-dashed">
      <EmptyHeader><EmptyTitle>{C.noSettles}</EmptyTitle><EmptyDescription>{C.noSettlesBody}</EmptyDescription></EmptyHeader>
    </Empty>
  );
  const years: [string, typeof settlements][] = [];
  for (const s of settlements) {
    const y = s.date.slice(0, 4), last = years[years.length - 1];
    if (last && last[0] === y) last[1].push(s); else years.push([y, [s]]);
  }
  return (
    <div id="settle-list" className="flex flex-col gap-6">
      {years.map(([y, list]) => (
        <section key={y} aria-labelledby={`settle-${y}`} className="flex flex-col gap-1.5">
          <h2 id={`settle-${y}`} className="text-label text-muted-foreground">{y}</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {list.map((s) => (
              <li key={s.id}>
                <button type="button" data-act="detail" data-id={s.id} onClick={() => openSheet(`#/history/settle/${encodeURIComponent(s.id)}`)}
                  className="flex min-h-15 w-full items-center gap-3 px-4 py-3 text-left outline-offset-[-2px] active:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="t block font-medium">{settleRowDate(s)}</span>
                    <span className="s block text-caption text-muted-foreground">{settleRowSub(s, people.names, people.me)}</span>
                  </span>
                  <span className={s.amountCents ? "font-medium tabular-nums" : "text-muted-foreground"}>{s.amountCents ? fmt(s.amountCents) : ""}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
