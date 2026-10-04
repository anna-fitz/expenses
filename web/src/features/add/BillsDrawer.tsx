import { BottomDrawer } from "@/components/BottomDrawer";
import { Button } from "@/components/ui/button";
import { C, fmt } from "@/domain/copy.js";
import type { AddFlow } from "./useAddFlow";

export function BillsDrawer({ f }: { f: AddFlow }) {
  const bills = f.bills.filter((b) => b.active !== false).sort((x, y) => (x.order || 0) - (y.order || 0));
  const cancel = () => f.set({ billsOpen: false });
  return (
    <BottomDrawer id="bills" title={C.bills} open={f.a.billsOpen} onClose={cancel} focusAfterClose="[data-act=clear-bill]"
      footer={<Button variant="outline" size="lg" className="h-13 w-full text-body" data-act="bills-cancel" onClick={cancel}>{C.cancel}</Button>}>
      {bills.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {bills.map((b) => (
            <li key={b.id}>
              <button type="button" data-act="bill" data-id={b.id} onClick={() => f.pickBill(b)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left outline-offset-[-2px] active:bg-muted">
                <span className="flex-1 font-medium">{b.name}</span>
                <span className="tabular-nums text-muted-foreground">{fmt(b.usualCents)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted-foreground">{C.noBills}</p>}
    </BottomDrawer>
  );
}
