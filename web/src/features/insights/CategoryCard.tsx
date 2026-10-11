import { ChevronRight } from "lucide-react";
import type { Expense } from "@/data/types";
import { C, categoryLine, changeChip, fmt, fmtRound } from "@/domain/copy.js";
import { BUCKETS, bucketOf, pctOf, type Bucket, type CategoryRow, type Figures, type Mapped } from "@/domain/insights";
import { MonthItems } from "./MonthItems";
import { BUCKET_COLOR, BUCKET_LABEL, BulletBar, CardLabel, Chip, Disclosure, Swatch } from "./parts";

const TOP = 6;
// Where it went: bills, needs and wants as one split bar, then every category as a row — its group's color, whole-dollar amount,
// and a bar against a tick for its usual on one shared scale. Gaps of 15% or more get a chip. App months open to the expenses.
export function CategoryCard({ f, rows, mix, map, items, onOpen }: {
  f: Figures | null; rows: CategoryRow[]; mix: Record<Bucket, number> | null; map: Partial<Record<string, Mapped>>; items: Expense[] | null; onOpen: () => void;
}) {
  const total = f?.total || 0;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.cents, r.usual || 0)));
  const row = (r: CategoryRow) => {
    const text = categoryLine(r.category, fmt(r.cents), r.usual == null ? null : r.usual ? fmt(r.usual) : 0, r.pct ?? 0);
    const mine = items?.filter((x) => (x.category || "Other") === r.category);
    const cells = (
      <span className="flex flex-col gap-1.5 py-1" aria-hidden="true">
        <span className="flex items-center gap-2">
          <Swatch color={BUCKET_COLOR[bucketOf(r.category, map)]} /><span className="min-w-0 flex-1 truncate">{r.category}</span>
          {r.pct != null && Math.abs(r.pct) >= 15 && <Chip>{changeChip(r.pct)}</Chip>}
          <span className="w-16 text-right font-medium tabular-nums">{fmtRound(r.cents)}</span>
        </span>
        <BulletBar value={r.cents} usual={r.usual} max={max} />
      </span>
    );
    return (
      <li key={r.category} data-cat={r.category} className="border-t first:border-t-0">
        {mine?.length ? (
          <Disclosure summary={<>{cells}<span className="sr-only">{text}</span></>}><MonthItems items={mine} /></Disclosure>
        ) : <div className="flex min-h-11 items-center pr-6">{cells}<span className="sr-only">{text}</span></div>}
      </li>
    );
  };
  return (
    <section id="cats" aria-labelledby="cats-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <CardLabel id="cats-h" aside={<span className="text-caption tabular-nums">{fmtRound(total)}</span>}>{C.needsWants}</CardLabel>
      {total > 0 && (
        <div id="needs" className="flex flex-col gap-2">
          <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {BUCKETS.map((b) => f!.buckets[b] > 0 && <span key={b} style={{ width: `${(f!.buckets[b] / total) * 100}%`, background: BUCKET_COLOR[b] }} />)}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption tabular-nums">
            {BUCKETS.map((b) => (
              <li key={b} data-bucket={b} className="flex items-center gap-1.5">
                <Swatch color={BUCKET_COLOR[b]} />
                <span>{BUCKET_LABEL[b]} {pctOf(f!.buckets[b], total)}%</span>
                {mix && <span className="text-muted-foreground">({C.usuallyPct} {mix[b]}%)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length > 0 && (
        <>
          <ul className="flex flex-col" aria-label={C.byCategory}>{rows.slice(0, TOP).map(row)}</ul>
          {rows.length > TOP && (
            <details id="cats-more" className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-caption text-muted-foreground [&::-webkit-details-marker]:hidden">
                {C.allCategories}<ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden="true" /></summary>
              <ul className="flex flex-col">{rows.slice(TOP).map(row)}</ul>
            </details>
          )}
          <p className="flex items-center gap-3 text-label text-muted-foreground" aria-hidden="true">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-foreground" />{C.thisMonth}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-0.5 bg-muted-foreground" />{C.usualWord}</span>
          </p>
        </>
      )}
      <button type="button" data-act="needs-open" onClick={onOpen} className="flex min-h-11 items-center gap-1 self-start text-body underline underline-offset-4">
        {C.needsTrend}<ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
