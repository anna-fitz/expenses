import { closeSheet } from "@/app/route";
import { BarChart } from "@/components/BarChart";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { C, fmt, monthShort } from "@/domain/copy.js";
import { BUCKETS, shiftMonth, type Figures } from "@/domain/insights";
import { BUCKET_COLOR, BUCKET_LABEL } from "./NeedsCard";

// Twelve months of Bills / Needs / Wants: a stacked chart, then the same numbers as a table.
export function NeedsSheet({ month, get }: { month: string; get: (m: string) => Figures | null }) {
  const close = () => closeSheet(`#/insights/${month}`);
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(month, i - 11)), figs = months.map(get);
  const label = (m: string) => `${monthShort(m)} ${m.slice(0, 4)}`;
  return (
    <Sheet title={C.needsWants} onClose={close}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={close}>{C.cancel}</Button>}>
      <div id="needs-chart">
        <BarChart id="needs-bars" title={`${C.needsWants}, ${label(months[0])} to ${label(month)}`} selected={11} format={fmt}
          legend={BUCKETS.map((b) => ({ label: BUCKET_LABEL[b], color: BUCKET_COLOR[b] }))}
          bars={months.map((m, i) => ({ key: m, label: monthShort(m), segments: BUCKETS.map((b) => ({ value: figs[i]?.buckets[b] || 0, color: BUCKET_COLOR[b] })) }))} />
      </div>
      <table id="needs-table" className="w-full text-caption tabular-nums">
        <thead><tr className="text-left text-muted-foreground"><th className="py-1 font-medium">{C.monthCol}</th>{BUCKETS.map((b) => <th key={b} className="py-1 text-right font-medium">{BUCKET_LABEL[b]}</th>)}</tr></thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m} className="border-t">
              <td className="py-1.5">{label(m)}</td>
              {BUCKETS.map((b) => <td key={b} className="py-1.5 text-right">{figs[i] ? fmt(figs[i]!.buckets[b]) : "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  );
}
