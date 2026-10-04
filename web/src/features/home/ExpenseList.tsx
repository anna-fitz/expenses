import { PersonAvatar } from "@/components/PersonAvatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/data/data";
import type { Expense } from "@/data/types";
import { C, dayLabel, emptyBody, fmt } from "@/domain/copy.js";
import { groupByDate, sortExpenses } from "@/domain/money";
import { canonicalName } from "@/domain/stores.js";

function ExpenseRow({ e }: { e: Expense }) {
  const { merchants, people } = useData();
  const sub = [`${people.names[e.payer] || "Someone"} paid`, e.category, e.covers].filter(Boolean).join(" · ");
  return (
    <li data-id={e.id} className="flex min-h-15 items-center gap-3 px-4 py-3">
      <PersonAvatar who={e.payer} />
      <span className="min-w-0 flex-1">
        <span className="t block truncate font-medium">{canonicalName(merchants, e.merchant)}{e.note ? <span className="font-normal text-muted-foreground"> {e.note}</span> : null}</span>
        <span className="s block truncate text-caption text-muted-foreground">{sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-medium tabular-nums">{fmt(e.amountCents)}</span>
        {e.split === "full" && <Badge variant="outline" className="rounded-full">Owed in full</Badge>}
      </span>
    </li>
  );
}
export function ExpenseList() {
  const { loaded, expenses, people } = useData();
  if (!loaded) return <Skeleton className="h-32 rounded-xl" />;
  if (!expenses.length) return (
    <Empty className="rounded-xl border border-dashed">
      <EmptyHeader><EmptyTitle>{C.emptyTitle}</EmptyTitle><EmptyDescription>{emptyBody(people.names[people.them])}</EmptyDescription></EmptyHeader>
    </Empty>
  );
  return (
    <div className="flex flex-col gap-6">
      {groupByDate(sortExpenses(expenses)).map(([date, list]) => (
        <section key={date} className="group flex flex-col gap-1.5">
          <h2 className="text-label text-muted-foreground">{dayLabel(date)}</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">{list.map((e) => <ExpenseRow key={e.id} e={e} />)}</ul>
        </section>
      ))}
    </div>
  );
}
