import { PersonAvatar } from "@/components/PersonAvatar";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/data/data";
import type { Expense } from "@/data/types";
import { C, fmt } from "@/domain/copy.js";
import { canonicalName } from "@/domain/stores.js";
import { cn } from "@/lib/utils";

// One expense. With onOpen the whole row is one button (it opens Edit); without, it's read-only (settled history).
export function ExpenseRow({ e, onOpen }: { e: Expense; onOpen?: () => void }) {
  const { merchants, people } = useData();
  const sub = [`${people.names[e.payer] || C.someone} paid`, e.category, e.covers].filter(Boolean).join(" · ");
  const inner = (
    <>
      <PersonAvatar who={e.payer} />
      <span className="min-w-0 flex-1">
        <span className="t block truncate font-medium">{canonicalName(merchants, e.merchant)}{e.note ? <span className="font-normal text-muted-foreground"> {e.note}</span> : null}</span>
        <span className="s block truncate text-caption text-muted-foreground">{sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-medium tabular-nums">{fmt(e.amountCents)}</span>
        {e.split === "full" && <Badge variant="outline" className="rounded-full">{C.splitFull}</Badge>}
      </span>
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
