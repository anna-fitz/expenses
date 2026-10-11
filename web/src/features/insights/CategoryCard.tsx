import type { Expense } from "@/data/types";
import { C, categoryLine, fmt } from "@/domain/copy.js";
import type { CategoryRow } from "@/domain/insights";
import { MonthItems } from "./MonthItems";

const TOP = 5;
// Everyday spending by category, biggest first, each against its usual. Bills and one-offs are left out, as in the headline.
// For months logged in the app (`items` given), each category opens to the expenses in it; summary months have totals only.
export function CategoryCard({ rows, items }: { rows: CategoryRow[]; items: Expense[] | null }) {
  if (!rows.length) return null;
  const line = (r: CategoryRow) => {
    const text = categoryLine(r.category, fmt(r.cents), r.usual == null ? null : r.usual ? fmt(r.usual) : 0, r.pct ?? 0);
    const mine = items?.filter((x) => (x.category || "Other") === r.category);
    return (
      <li key={r.category} data-cat={r.category} className="tabular-nums">
        {mine?.length ? (
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center underline-offset-4 hover:underline">{text}</summary>
            <MonthItems items={mine} />
          </details>
        ) : text}
      </li>
    );
  };
  return (
    <section id="cats" aria-labelledby="cats-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id="cats-h" className="text-heading">{C.byCategory}</h2>
      <ul className="flex flex-col gap-1">{rows.slice(0, TOP).map(line)}</ul>
      {rows.length > TOP && (
        <details id="cats-more">
          <summary className="flex min-h-11 cursor-pointer items-center text-body underline underline-offset-4">{C.allCategories}</summary>
          <ul className="flex flex-col gap-1">{rows.slice(TOP).map(line)}</ul>
        </details>
      )}
    </section>
  );
}
