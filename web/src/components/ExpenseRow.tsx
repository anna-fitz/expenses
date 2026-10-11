import { ChevronRight } from "lucide-react";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/data/data";
import type { Expense } from "@/data/types";
import { billNamed } from "@/domain/bills";
import { C, fmt, personName } from "@/domain/copy.js";
import { canonicalName } from "@/domain/stores.js";
import { cn } from "@/lib/utils";

// One expense. With onOpen the whole row is one button with a chevron (Edit, or the read-only view); without, it's plain (settled history).
// Bills say so, and show the months they cover where the category would be.
export function ExpenseRow({ e, onOpen }: { e: Expense; onOpen?: () => void }) {
  const { merchants, people, bills } = useData(), isBill = !!e.billId || !!billNamed(bills, e.merchant);   // the old app could save a bill as a store
  const sub = [`${personName(e.payer, people.names, people.me)} paid`, isBill && e.covers ? e.covers : e.category, !isBill && e.covers].filter(Boolean).join(" · ");
  const inner = (
    <>
      <PersonAvatar who={e.payer} />
      <span className="min-w-0 flex-1">
        <span className="t flex min-w-0 items-center gap-1.5 font-medium">
          <span className="truncate">{canonicalName(merchants, e.merchant)}{e.note ? <span className="font-normal text-muted-foreground"> {e.note}</span> : null}</span>
          {isBill && <Badge variant="outline" className="shrink-0 rounded-full" data-tag="bill">{C.billTag}</Badge>}
        </span>
        <span className="s block truncate text-caption text-muted-foreground">{sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-medium tabular-nums">{fmt(e.amountCents)}</span>
        {e.split === "full" && <Badge variant="outline" className="rounded-full">{C.splitFull}</Badge>}
      </span>
      {onOpen && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const cls = "flex min-h-15 w-full items-center gap-3 px-4 py-3 text-left";
  return (
    <li>
      {onOpen
        ? <button type="button" data-act="edit" data-id={e.id} onClick={onOpen} className={cn(cls, "outline-offset-[-2px] active:bg-muted")}>{inner}</button>
        : <div data-id={e.id} className={cls}>{inner}</div>}
    </li>
  );
}
