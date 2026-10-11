import { ArrowDown, ArrowUp } from "lucide-react";
import type { Bill, Expense } from "@/data/types";
import { C, billLine, billsInLabel, billsSoFar, fmtRound, lastMonthName, lastYearLine, oneOffsLine, onTrackLine, paceChip, paceLine, pastLine,
  pastOneOffs, sparkLabel, usualByDay, usualIs, usualMonthLabel, vsUsualChip } from "@/domain/copy.js";
import { EMPTY, daysIn, pace, type Figures } from "@/domain/insights";
import { MonthItems } from "./MonthItems";
import { CardLabel, Chip, Disclosure, Hero, PaceMeter, Sparkline } from "./parts";

// Bills that used to be split before the app (housing, mostly) have no bill in the app to take a name from.
const OLD_BILLS: Record<string, string> = { mortgage: "Mortgage", hoa: "HOA", rent: "Rent", "property-tax": "Property tax" };

// The headline: everyday spending as one large figure, its comparison as a chip, a labelled pace meter (this month) and
// a 12-month sparkline; then bills as pills that fill in as they arrive, and one-offs. Each opens to its detail.
export function OnTrackCard({ month, current, day, f, usualEvery, bills, lastYear, prev, oneOffItems, spark }: {
  month: string; current: boolean; day: number; f: Figures | null; usualEvery: number | null; bills: Bill[]; lastYear: Figures | null;
  prev: Figures | null; oneOffItems: Expense[] | null; spark: (number | null)[];
}) {
  const how = (
    <details id="usual-how" className="text-caption text-muted-foreground">
      <summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">{C.howUsual}</summary>
      <p>{C.usualExplained}</p>
    </details>
  );
  if (!current && !f) return <section id="ontrack" className="rounded-xl border bg-card p-4"><p id="ontrack-line">{C.noMonth}</p>{how}</section>;
  const x = f || EMPTY;
  const ly = lastYear && <p id="ontrack-lastyear" className="text-caption text-muted-foreground">{lastYearLine(month, fmtRound(lastYear.everyday))}</p>;

  // The headline figure and its comparison
  let head;
  if (usualEvery == null) {
    head = (
      <>
        <CardLabel id="ontrack-h">{C.everyday}</CardLabel>
        <Hero id="ontrack-amount" value={fmtRound(x.everyday)} />
        <p id="ontrack-line" className="text-caption text-muted-foreground">{C.notEnough}</p>
      </>
    );
  } else if (!current) {
    const pct = Math.round(((x.everyday - usualEvery) / usualEvery) * 100);
    head = (
      <>
        <CardLabel id="ontrack-h" aside={<Chip id="ontrack-status">{pct !== 0 && (pct > 0 ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />)}{vsUsualChip(pct)}</Chip>}>{C.everyday}</CardLabel>
        <Hero id="ontrack-amount" value={fmtRound(x.everyday)} />
        <p className="text-caption text-muted-foreground">{usualIs(fmtRound(usualEvery))}</p>
        <p id="ontrack-line" className="sr-only">{pastLine(fmtRound(x.everyday), fmtRound(usualEvery), pct)}</p>
      </>
    );
  } else {
    const p = pace(x.everyday, usualEvery, day, daysIn(month)), diff = fmtRound(Math.abs(x.everyday - p.byNow));
    const Arrow = p.status === "high" ? ArrowUp : p.status === "low" ? ArrowDown : null;
    head = (
      <>
        <CardLabel id="ontrack-h" aside={<Chip id="ontrack-status" tone={p.status === "high" ? "warn" : "plain"}>{Arrow && <Arrow className="size-3" aria-hidden="true" />}{paceChip(p.status, diff)}</Chip>}>{C.everyday}</CardLabel>
        <Hero id="ontrack-amount" value={fmtRound(x.everyday)} unit={C.soFar} />
        <PaceMeter spent={x.everyday} byNow={p.byNow} month={usualEvery} over={x.everyday > usualEvery}
          label={usualByDay(day)} endLabel={usualMonthLabel(fmtRound(usualEvery))} />
        <p id="ontrack-line" className="sr-only">{paceLine(p.status, fmtRound(x.everyday), diff, day)}. {onTrackLine(fmtRound(x.everyday), fmtRound(p.byNow))}</p>
      </>
    );
  }

  // Bills: pills for this month (filled once in), then each bill against last month and last year
  const active = bills.filter((b) => b.active !== false).sort((a, b) => a.order - b.order);
  const name = (id: string) => bills.find((b) => b.id === id)?.name || OLD_BILLS[id] || id;
  const ids = [...new Set([...(current ? active.map((b) => b.id) : []), ...Object.keys(x.billsBy).filter((id) => x.billsBy[id] > 0)])];
  const amt = (y: Figures | null, id: string) => (y?.billsBy[id] ? fmtRound(y.billsBy[id]) : null);
  const got = active.filter((b) => (x.billsBy[b.id] || 0) > 0).length;
  const billsHead = (
    <span className="flex items-center justify-between gap-3">
      <span className="text-label uppercase tracking-wide text-muted-foreground">{current ? billsInLabel(got, active.length) : C.bills}</span>
      <span className="text-caption tabular-nums">{current ? billsSoFar(fmtRound(x.bills)) : fmtRound(x.bills)}</span>
    </span>
  );
  return (
    <section id="ontrack" aria-labelledby="ontrack-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      {head}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">{ly}</div>
        <Sparkline values={spark} label={sparkLabel} />
      </div>
      {how}
      <div className="flex flex-col gap-1 border-t pt-3">
        {current && active.length > 0 && (
          <ul id="bill-pills" className="flex flex-wrap gap-1.5 pb-1" aria-label={billsInLabel(got, active.length)}>
            {active.map((b) => {
              const isIn = (x.billsBy[b.id] || 0) > 0;
              return <li key={b.id} data-in={isIn} className={isIn ? "rounded-full bg-chart-1 px-2.5 py-1 text-label text-white"
                : "rounded-full border border-dashed border-muted-foreground px-2.5 py-1 text-label text-muted-foreground"}>
                {b.name}<span className="sr-only">{isIn ? `, ${C.billIn}` : `, ${C.billToCome}`}</span></li>;
            })}
          </ul>
        )}
        {ids.length ? (
          <Disclosure id="ontrack-bills" summary={billsHead}>
            <ul className="flex flex-col gap-1 border-l-2 pl-3 text-caption tabular-nums">
              {ids.map((id) => <li key={id} data-bill={id}>{billLine(name(id), amt(x, id), amt(prev, id), amt(lastYear, id), lastMonthName(month))}</li>)}
            </ul>
          </Disclosure>
        ) : <div id="ontrack-bills" className="flex min-h-11 items-center">{billsHead}</div>}
        {(x.oneOffs > 0 || !current) && (
          <OneOffsRow f={x} items={oneOffItems} line={current ? oneOffsLine(fmtRound(x.oneOffs), x.oneOffCount) : pastOneOffs(x.oneOffs ? fmtRound(x.oneOffs) : null)} />
        )}
      </div>
    </section>
  );
}

// What the one-offs were: the purchases for months in the app, the categories for summary months. `line` is "One-offs: $498".
export function OneOffsRow({ f, items, line, id = "ontrack-oneoffs" }: { f: Figures; items: Expense[] | null; line: string; id?: string }) {
  const [label, ...rest] = line.split(": ");
  const head = (
    <span className="flex items-center justify-between gap-3">
      <span className="text-label uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-caption tabular-nums">{rest.join(": ")}</span>
    </span>
  );
  if (!f.oneOffs) return <div id={id} className="flex min-h-11 items-center">{head}</div>;
  return (
    <Disclosure id={id} summary={head}>
      {items?.length ? <MonthItems items={items} /> : (
        <ul className="flex flex-col gap-1 border-l-2 pl-3 text-caption tabular-nums">
          {Object.entries(f.oneOffBy).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
            <li key={c} className="flex gap-2"><span className="flex-1">{c}</span><span>{fmtRound(v)}</span></li>
          ))}
        </ul>
      )}
    </Disclosure>
  );
}
