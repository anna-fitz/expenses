import { ChevronRight } from "lucide-react";
import { C, bucketLine, fmt } from "@/domain/copy.js";
import { BUCKETS, pctOf, type Bucket, type Figures } from "@/domain/insights";

export const BUCKET_LABEL: Record<Bucket, string> = { bill: C.bills, need: C.needs, want: C.wants };
export const BUCKET_COLOR: Record<Bucket, string> = { bill: "var(--chart-1)", need: "var(--chart-2)", want: "var(--chart-3)" };

// One bar split three ways (fixed order and colors), with every part named in text.
export function NeedsCard({ f, mix, onOpen }: { f: Figures | null; mix: Record<Bucket, number> | null; onOpen: () => void }) {
  const total = f?.total || 0;
  return (
    <section id="needs" aria-labelledby="needs-h" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id="needs-h" className="text-heading">{C.needsWants}</h2>
      {total > 0 && (
        <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {BUCKETS.map((b) => f!.buckets[b] > 0 && <span key={b} style={{ width: `${(f!.buckets[b] / total) * 100}%`, background: BUCKET_COLOR[b] }} />)}
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {BUCKETS.map((b) => (
          <li key={b} data-bucket={b} className="flex items-center gap-2 tabular-nums">
            <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ background: BUCKET_COLOR[b] }} />
            {bucketLine(BUCKET_LABEL[b], fmt(f?.buckets[b] || 0), pctOf(f?.buckets[b] || 0, total), mix ? mix[b] : null)}
          </li>
        ))}
      </ul>
      <button type="button" data-act="needs-open" onClick={onOpen} className="flex min-h-11 items-center gap-1 self-start text-body underline underline-offset-4">
        {C.needsTrend}<ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
