import { ArrowDown, ArrowUp } from "lucide-react";
import { BarChart } from "@/components/BarChart";
import type { Expense } from "@/data/types";
import { C, changeChip, dumbbellRow, fmtRound, monthLabel, pastOneOffs, prevYearIs, vsYearChip, yearLabel } from "@/domain/copy.js";
import { pctChange, yearFigures, type Figures } from "@/domain/insights";
import { OneOffsRow } from "./OnTrackCard";
import { CardLabel, Chip, Disclosure, Dumbbell, Hero } from "./parts";

// The fixed colors for the three parts of a year, matching the month view: everyday (needs and wants together), bills, one-offs.
const PARTS = [
  { key: "everyday", label: C.everyday, color: "var(--chart-2)", pick: (f: Figures) => f.everyday },
  { key: "bills", label: C.yearBills, color: "var(--chart-1)", pick: (f: Figures) => f.bills },
  { key: "oneOffs", label: C.yearOneOffs, color: "var(--chart-3)", pick: (f: Figures) => f.oneOffs },
] as const;

// A whole year (or this year so far) against the same months of the year before: one large figure, a dumbbell per category,
// then every year as stacked columns with the table one tap away.
export function YearView({ year, current, get, firstYear, items, go }: {
  year: number; current: string; get: (k: string) => Figures | null; firstYear: number; items: Expense[] | null; go: (y: number) => void;
}) {
  const thisYear = Number(current.slice(0, 4)), upTo = year === thisYear ? current : `${year}-12`, partial = upTo !== `${year}-12`;
  const { f, prev } = yearFigures(year, upTo, get);
  if (!f) return <section id="year" className="rounded-xl border bg-card p-4"><p id="year-line">{C.noMonth}</p></section>;
  const pct = prev ? pctChange(f.everyday, prev.everyday) : null;
  const cats = Object.keys({ ...f.byCategory, ...(prev?.byCategory || {}) }).filter((c) => (f.byCategory[c] || 0) > 0)
    .sort((a, b) => f.byCategory[b] - f.byCategory[a]);
  const max = Math.max(1, ...cats.map((c) => Math.max(f.byCategory[c], prev?.byCategory[c] || 0)));
  const change = (c: string) => pctChange(f.byCategory[c], prev?.byCategory[c] || 0);
  // The two biggest moves by dollars are set in bold, so the eye lands on what changed most.
  const big = [...cats].sort((a, b) => Math.abs(f.byCategory[b] - (prev?.byCategory[b] || 0)) - Math.abs(f.byCategory[a] - (prev?.byCategory[a] || 0))).slice(0, 2);
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => firstYear + i);
  const yf = years.map((y) => yearFigures(y, y === thisYear ? current : `${y}-12`, get).f);
  const oneOffItems = items?.filter((x) => x.oneOff && !x.billId && x.date.slice(0, 4) === String(year)) ?? null;
  return (
    <>
      <section id="year" aria-labelledby="year-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <CardLabel id="year-h" aside={<Chip id="year-status">{pct != null && pct !== 0 && (pct > 0 ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />)}{vsYearChip(pct, year - 1)}</Chip>}>
          {C.everyday} · {yearLabel(year, partial, monthLabel(upTo).split(" ")[0])}</CardLabel>
        <Hero id="year-amount" value={fmtRound(f.everyday)} />
        {prev && <p id="year-prev" className="text-caption text-muted-foreground">{prevYearIs(year - 1, fmtRound(prev.everyday), partial)}</p>}
        <div className="flex flex-col gap-1 border-t pt-3">
          <div id="year-bills" className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-label uppercase tracking-wide text-muted-foreground">{C.yearBills}</span>
            <span className="text-caption tabular-nums">{fmtRound(f.bills)}{prev?.bills ? <span className="text-muted-foreground"> · {year - 1}: {fmtRound(prev.bills)}</span> : null}</span>
          </div>
          <OneOffsRow id="year-oneoffs" f={f} items={oneOffItems} line={pastOneOffs(f.oneOffs ? fmtRound(f.oneOffs) : null)} />
        </div>
      </section>
      <section id="year-cats" aria-labelledby="year-cats-h" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <CardLabel id="year-cats-h" aside={prev ? (
          <span className="flex items-center gap-3 text-label text-muted-foreground" aria-hidden="true">
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-muted-foreground" />{year - 1}</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-foreground" />{year}</span>
          </span>) : undefined}>{C.byCategoryShort}</CardLabel>
        <ul className="flex flex-col">
          {cats.map((c) => {
            const before = prev?.byCategory[c] || 0, ch = change(c);
            return (
              <li key={c} data-cat={c} className="border-t first:border-t-0">
                <Disclosure summary={
                  <span className="flex flex-col gap-1 py-1">
                    <span className="flex items-center gap-2" aria-hidden="true">
                      <span className={big.includes(c) ? "min-w-0 flex-1 truncate font-semibold" : "min-w-0 flex-1 truncate"}>{c}</span>
                      <span className="text-caption tabular-nums text-muted-foreground">{fmtRound(f.byCategory[c])}</span>
                      <span className={big.includes(c) ? "w-14 text-right text-caption font-semibold tabular-nums" : "w-14 text-right text-caption tabular-nums text-muted-foreground"}>{changeChip(ch)}</span>
                    </span>
                    <Dumbbell before={before} now={f.byCategory[c]} max={max} />
                    <span className="sr-only">{dumbbellRow(c, fmtRound(f.byCategory[c]), before ? fmtRound(before) : null, year)}</span>
                  </span>}>
                  <p className="border-l-2 pl-3 text-caption tabular-nums text-muted-foreground" aria-hidden="true">{dumbbellRow(c, fmtRound(f.byCategory[c]), before ? fmtRound(before) : null, year)}</p>
                </Disclosure>
              </li>
            );
          })}
        </ul>
      </section>
      <section id="years" aria-labelledby="years-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <CardLabel id="years-h">{C.yearsTable}</CardLabel>
        <BarChart id="years-chart" title={C.yearsChartTitle} selected={years.indexOf(year)} onSelect={(i) => go(years[i])} format={fmtRound}
          legend={PARTS.map((p) => ({ label: p.label, color: p.color }))}
          bars={years.map((y, i) => ({ key: String(y), label: String(y), partial: y === thisYear && current.slice(5) !== "12",
            segments: PARTS.map((p) => ({ value: yf[i] ? p.pick(yf[i]!) : 0, color: p.color })) }))} />
        <details id="years-more" className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-caption text-muted-foreground underline underline-offset-4 [&::-webkit-details-marker]:hidden">{C.showTable}</summary>
          <div className="overflow-x-auto">
            <table id="years-table" className="w-full text-caption tabular-nums">
              <thead><tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">{C.yearCol}</th>{PARTS.map((p) => <th key={p.key} className="py-1 text-right font-medium">{p.label}</th>)}
              </tr></thead>
              <tbody>
                {[...years].reverse().map((y) => {
                  const x = yf[years.indexOf(y)];
                  return (
                    <tr key={y} className={y === year ? "border-t bg-muted font-medium" : "border-t"} aria-current={y === year ? "true" : undefined}>
                      <td className="py-1.5"><a href={`#/insights/${y}`} className="underline-offset-4 hover:underline">{y === thisYear ? `${y} ${C.soFar}` : y}</a></td>
                      {PARTS.map((p) => <td key={p.key} className="py-1.5 text-right">{x ? fmtRound(p.pick(x)) : "—"}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
