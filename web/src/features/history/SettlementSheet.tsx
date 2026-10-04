import { useEffect, useState } from "react";
import { closeSheet } from "@/app/route";
import { ExpenseRow } from "@/components/ExpenseRow";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useData } from "@/data/data";
import type { Expense } from "@/data/types";
import { settledExpenses } from "@/data/writes";
import { C, settledTitle } from "@/domain/copy.js";
import { settleRows, sortExpenses } from "@/domain/money";
import { cn } from "@/lib/utils";

export function SettlementSheet({ id }: { id: string }) {
  const { settlements, people } = useData(), s = settlements.find((x) => x.id === id);
  const [list, setList] = useState<Expense[] | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    settledExpenses(id).then((l) => { if (live) setList(sortExpenses(l)); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [id]);
  const close = () => closeSheet("#/history");
  if (!s) return null;   // settle-ups still loading, or an unknown id: History stays on screen
  return (
    <Sheet title={settledTitle(s.date)} onClose={close}
      actions={<Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="close" onClick={close}>{C.back}</Button>}>
      <dl className="math rounded-xl border bg-card p-4">
        {settleRows(s, people.a, people.b, people.names).map((r, i) => (
          <div key={i} className={cn("r flex justify-between gap-3 py-1.5", r.total && "total mt-1 border-t pt-3 font-medium")}>
            <dt>{r.label}</dt><dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div id="d-list">
        {failed ? <p role="alert" className="text-caption text-destructive">{C.detailFailed}</p>
          : !list ? <Skeleton className="h-32 rounded-xl" />
          : !list.length ? <p className="text-muted-foreground">{C.noExpensesFound}</p>
          : <ul className="divide-y overflow-hidden rounded-xl border bg-card">{list.map((e) => <ExpenseRow key={e.id} e={e} />)}</ul>}
      </div>
    </Sheet>
  );
}
