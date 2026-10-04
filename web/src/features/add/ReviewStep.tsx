import { ChevronRight } from "lucide-react";
import { C, atLine, dateLabel, fmt, splitLine } from "@/domain/copy.js";
import { cn } from "@/lib/utils";
import type { AddFlow } from "./useAddFlow";

type Row = { key: string; label: string; value: string; sub?: string; go?: () => void };
// "Look good?": every value, each row taking you to the one place it's edited.
export function ReviewStep({ f }: { f: AddFlow }) {
  const { a, people, target } = f;
  if (!target) return null;
  const other = a.payer === people.a ? people.b : people.a, note = a.note.trim();
  const rows: Row[] = [
    { key: "store", label: C.store, value: target.name, sub: note || undefined, go: target.isBill ? undefined : () => f.jump("where") },
    { key: "amount", label: C.amount, value: fmt(f.cents), go: () => f.jump("amount") },
    { key: "payer", label: C.paidBy, value: a.payer === people.me ? C.you : people.names[a.payer], go: () => f.openDetails("payer") },
    { key: "split", label: C.split, value: splitLine(people.names[other], a.split, f.cents), go: () => f.openDetails("split") },
    { key: "date", label: C.date, value: dateLabel(a.date), go: () => f.openDetails("date") },
    { key: "category", label: C.category, value: a.category || target.category || "Other", go: () => f.openDetails("category") },
    ...(a.covers.trim() || a.bill ? [{ key: "covers", label: C.covers, value: a.covers.trim() || "—", go: () => f.openDetails("covers") }] : []),
  ];
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left";
  return (
    <>
      <div className="flex flex-col gap-1 py-4">
        <p id="rv-amt" className="text-hero tabular-nums">{fmt(f.cents)}</p>
        <p id="rv-at" className="text-body text-muted-foreground">{atLine(target.name, target.isBill)}</p>
      </div>
      <ul id="review" className="divide-y overflow-hidden rounded-xl border bg-card">
        {rows.map((r) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-caption text-muted-foreground">{r.label}</span>
                <span className="v block truncate font-medium">{r.value}</span>
                {r.sub && <span className="block truncate text-caption text-muted-foreground">{r.sub}</span>}
              </span>
              {r.go && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            </>
          );
          return (
            <li key={r.key} data-row={r.key}>
              {r.go
                ? <button type="button" data-act={`rv-${r.key}`} aria-label={`${r.label}, ${r.value}${r.sub ? `, ${r.sub}` : ""}`} onClick={r.go}
                    className={cn(cls, "outline-offset-[-2px] active:bg-muted")}>{body}</button>
                : <div className={cls}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
