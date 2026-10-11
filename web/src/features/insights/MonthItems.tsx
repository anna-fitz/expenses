import { useData } from "@/data/data";
import type { Expense } from "@/data/types";
import { fmt, shortDate } from "@/domain/copy.js";
import { canonicalName } from "@/domain/stores.js";

// The expenses behind a figure, newest first. Who paid stays off Insights, so it isn't shown.
export function MonthItems({ items }: { items: Expense[] }) {
  const { merchants } = useData();
  return (
    <ul className="mt-1 flex flex-col gap-1 border-l-2 pl-3 text-caption text-muted-foreground">
      {[...items].sort((a, b) => b.date.localeCompare(a.date) || b.amountCents - a.amountCents).map((x) => (
        <li key={x.id} className="flex gap-2 tabular-nums">
          <span className="min-w-0 flex-1 truncate">{canonicalName(merchants, x.merchant)}{x.note ? ` · ${x.note}` : ""}</span>
          <span>{shortDate(x.date)}</span><span className="w-20 text-right">{fmt(x.amountCents)}</span>
        </li>
      ))}
    </ul>
  );
}
