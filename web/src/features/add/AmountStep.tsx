import { Choice } from "@/components/Choice";
import { Button } from "@/components/ui/button";
import { amountText } from "@/domain/amount";
import { C, billFor, fmt } from "@/domain/copy.js";
import { cn } from "@/lib/utils";
import { NumberPad } from "./NumberPad";
import type { AddFlow } from "./useAddFlow";

export function AmountStep({ f }: { f: AddFlow }) {
  const { a, people } = f;
  const bills = f.bills.filter((b) => b.active !== false).sort((x, y) => (x.order || 0) - (y.order || 0));
  const describedBy = [a.bill ? "" : "amt-hint", a.err ? "amt-err" : ""].filter(Boolean).join(" ") || undefined;
  return (
    <>
      <div className="display flex flex-col gap-1">
        <div role="group" aria-labelledby="amt-label" aria-describedby={describedBy}>
          <p id="amt-label" className="text-label text-muted-foreground">{C.amount}</p>
          <p id="amt" className={cn("text-hero tabular-nums", !a.buf && "text-muted-foreground")}>{amountText(a.buf)}</p>
        </div>
        {a.bill
          ? <p className="billfor flex items-center gap-1 text-body">{billFor(a.bill.name)}
              <Button variant="link" className="h-11 px-2 text-body" data-act="clear-bill" onClick={f.clearBill}>{C.change}</Button></p>
          : <p id="amt-hint" className="text-caption text-muted-foreground">{C.amountHint}</p>}
        {a.err && <p id="amt-err" role="alert" className="text-caption text-destructive">{a.err}</p>}
      </div>
      <Choice name="payer" legend={C.paidBy} value={a.payer} onChange={(v) => f.set({ payer: v })}
        options={[{ value: people.me, label: C.you }, { value: people.them, label: people.names[people.them] }]} />
      {!a.bill && bills.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 id="bills-h" className="text-label text-muted-foreground">{C.bills}</h2>
          <div role="group" aria-labelledby="bills-h" className="flex flex-wrap gap-2">
            {bills.map((b) => (
              <Button key={b.id} variant="outline" className="h-11 rounded-full text-body" data-act="bill" data-id={b.id} onClick={() => f.pickBill(b)}>
                {b.name}<span className="font-medium tabular-nums text-muted-foreground">{fmt(b.usualCents)}</span>
              </Button>
            ))}
          </div>
        </section>
      )}
      <NumberPad onKey={f.key} />
    </>
  );
}
