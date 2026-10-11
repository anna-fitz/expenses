import type { Expense } from "@/data/types";
import { C, fmt, monthLabel, pastBills, pastOneOffs, yearCategoryLine, yearHead } from "@/domain/copy.js";
import { pctChange, yearFigures, type Figures } from "@/domain/insights";
import { OneOffs } from "./OneOffs";

// A whole year (or this year so far) against the same months of the year before, then every year side by side.
export function YearView({ year, current, get, firstYear, items }: {
  year: number; current: string; get: (k: string) => Figures | null; firstYear: number; items: Expense[] | null;
}) {
  const upTo = year === Number(current.slice(0, 4)) ? current : `${year}-12`, partial = upTo !== `${year}-12`;
  const { f, prev } = yearFigures(year, upTo, get);
  if (!f) return <section id="year" className="rounded-xl border bg-card p-4"><p id="year-line">{C.noMonth}</p></section>;
  const cats = Object.keys(f.byCategory).filter((c) => f.byCategory[c] > 0).sort((a, b) => f.byCategory[b] - f.byCategory[a]);
  const years = Array.from({ length: Number(current.slice(0, 4)) - firstYear + 1 }, (_, i) => Number(current.slice(0, 4)) - i);
  const yf = (y: number) => yearFigures(y, y === Number(current.slice(0, 4)) ? current : `${y}-12`, get).f;
  const oneOffItems = items?.filter((x) => x.oneOff && !x.billId && x.date.slice(0, 4) === String(year)) ?? null;
  return (
    <>
      <section id="year" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
        <p id="year-line" className="font-medium">{yearHead(year, partial, fmt(f.everyday), prev ? fmt(prev.everyday) : "", prev ? pctChange(f.everyday, prev.everyday) : null, monthLabel(upTo).split(" ")[0])}</p>
        <p id="year-bills" className="text-caption text-muted-foreground">{pastBills(fmt(f.bills))}{prev?.bills ? ` · ${year - 1}: ${fmt(prev.bills)}` : ""}</p>
        <OneOffs f={f} items={oneOffItems} line={pastOneOffs(f.oneOffs ? fmt(f.oneOffs) : null)} className="text-caption text-muted-foreground" />
      </section>
      <section id="year-cats" aria-labelledby="year-cats-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 id="year-cats-h" className="text-heading">{C.byCategoryYear}</h2>
        <ul className="flex flex-col gap-1 tabular-nums">
          {cats.map((c) => {
            const before = prev?.byCategory[c] || 0;
            return <li key={c} data-cat={c}>{yearCategoryLine(c, fmt(f.byCategory[c]), before ? fmt(before) : null, pctChange(f.byCategory[c], before) ?? 0, year - 1)}</li>;
          })}
        </ul>
      </section>
      <section id="years" aria-labelledby="years-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 id="years-h" className="text-heading">{C.yearsTable}</h2>
        <div className="overflow-x-auto">
          <table id="years-table" className="w-full text-caption tabular-nums">
            <thead><tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">{C.yearCol}</th><th className="py-1 text-right font-medium">{C.everyday}</th>
              <th className="py-1 text-right font-medium">{C.yearBills}</th><th className="py-1 text-right font-medium">{C.yearOneOffs}</th>
            </tr></thead>
            <tbody>
              {years.map((y) => {
                const x = yf(y);
                return (
                  <tr key={y} className={y === year ? "border-t bg-muted font-medium" : "border-t"} aria-current={y === year ? "true" : undefined}>
                    <td className="py-1.5"><a href={`#/insights/${y}`} className="underline-offset-4 hover:underline">{y === Number(current.slice(0, 4)) ? `${y} ${C.soFar}` : y}</a></td>
                    <td className="py-1.5 text-right">{x ? fmt(x.everyday) : "—"}</td><td className="py-1.5 text-right">{x ? fmt(x.bills) : "—"}</td>
                    <td className="py-1.5 text-right">{x ? fmt(x.oneOffs) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
