import { openSheet } from "@/app/route";
import { ExpenseRow } from "@/components/ExpenseRow";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/data/data";
import { C, dayLabel, emptyBody } from "@/domain/copy.js";
import { groupByDate, sortExpenses } from "@/domain/money";

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
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">{list.map((e) => <ExpenseRow key={e.id} e={e} onOpen={() => openSheet(`#/edit/${encodeURIComponent(e.id)}`)} />)}</ul>
        </section>
      ))}
    </div>
  );
}
