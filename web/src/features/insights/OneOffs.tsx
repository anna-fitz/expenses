import type { Expense } from "@/data/types";
import { fmt } from "@/domain/copy.js";
import type { Figures } from "@/domain/insights";
import { MonthItems } from "./MonthItems";

// What the one-offs were: the purchases for months in the app, the categories for summary months.
export function OneOffs({ f, items, line, className }: { f: Figures; items: Expense[] | null; line: string; className?: string }) {
  if (!f.oneOffs) return <p id="ontrack-oneoffs" className={className}>{line}</p>;
  return (
    <details id="ontrack-oneoffs" className={className}>
      <summary className="flex min-h-11 cursor-pointer items-center underline-offset-4 hover:underline">{line}</summary>
      {items?.length ? <MonthItems items={items} /> : (
        <ul className="mt-1 flex flex-col gap-1 border-l-2 pl-3 tabular-nums">
          {Object.entries(f.oneOffBy).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
            <li key={c} className="flex gap-2"><span className="flex-1">{c}</span><span>{fmt(v)}</span></li>
          ))}
        </ul>
      )}
    </details>
  );
}
