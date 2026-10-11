import type { Bill } from "@/data/types";
import { billLine, fmt, lastMonthName } from "@/domain/copy.js";
import type { Figures } from "@/domain/insights";

// Bills that used to be split before the app (housing, mostly) have no bill in the app to take a name from.
const OLD_BILLS: Record<string, string> = { mortgage: "Mortgage", hoa: "HOA", rent: "Rent", "property-tax": "Property tax" };

// Each bill this month, next to last month and the same month last year. This month, bills not in yet show as still to come.
export function BillsDetail({ line, month, current, f, prev, lastYear, bills, className }: {
  line: string; month: string; current: boolean; f: Figures; prev: Figures | null; lastYear: Figures | null; bills: Bill[]; className?: string;
}) {
  const active = bills.filter((b) => b.active !== false).sort((a, b) => a.order - b.order);
  const name = (id: string) => bills.find((b) => b.id === id)?.name || OLD_BILLS[id] || id;
  const ids = [...new Set([...(current ? active.map((b) => b.id) : []), ...Object.keys(f.billsBy).filter((id) => f.billsBy[id] > 0)])];
  if (!ids.length) return <p id="ontrack-bills" className={className}>{line}</p>;
  const amt = (x: Figures | null, id: string) => (x?.billsBy[id] ? fmt(x.billsBy[id]) : null);
  return (
    <details id="ontrack-bills" className={className}>
      <summary className="flex min-h-11 cursor-pointer items-center underline-offset-4 hover:underline">{line}</summary>
      <ul className="mt-1 flex flex-col gap-1 border-l-2 pl-3 tabular-nums">
        {ids.map((id) => <li key={id} data-bill={id}>{billLine(name(id), amt(f, id), amt(prev, id), amt(lastYear, id), lastMonthName(month))}</li>)}
      </ul>
    </details>
  );
}
