import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { amountText } from "@/domain/amount";
import { C, billFor } from "@/domain/copy.js";
import { cn } from "@/lib/utils";
import { NumberPad } from "./NumberPad";
import type { AddFlow } from "./useAddFlow";

// The amount is the hero; everything rare is one tap away (bills in a drawer; paid by on review and in Details).
export function AmountStep({ f }: { f: AddFlow }) {
  const { a } = f;
  return (
    <div className="flex flex-1 flex-col">
      <div className="display flex flex-1 flex-col items-start justify-center gap-2 py-6">
        <div role="group" aria-labelledby="amt-label" aria-describedby={a.err ? "amt-err" : undefined}>
          <p id="amt-label" className="text-label text-muted-foreground">{C.amount}</p>
          <p id="amt" className={cn("text-hero tabular-nums", !a.buf && "text-muted-foreground")}>{amountText(a.buf)}</p>
        </div>
        {a.err && <p id="amt-err" role="alert" className="text-caption text-destructive">{a.err}</p>}
        {a.bill ? (
          <p className="billfor flex items-center gap-1 text-body">{billFor(a.bill.name)} ·
            <Button variant="link" className="h-11 px-1 text-body" data-act="clear-bill" onClick={f.clearBill}>{C.change}</Button></p>
        ) : (
          <Button variant="outline" className="h-11 text-body" data-act="pick-bill" onClick={() => f.set({ billsOpen: true })}>
            <Receipt className="size-5" aria-hidden="true" />{C.pickBill}</Button>
        )}
      </div>
      <NumberPad onKey={f.key} />
    </div>
  );
}
