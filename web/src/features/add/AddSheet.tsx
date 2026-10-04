import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { C, billNext, fmt, paidByLine, saveAt } from "@/domain/copy.js";
import { NEW_STORE } from "@/domain/expenses";
import { AmountStep } from "./AmountStep";
import { DupAlert } from "./DupAlert";
import { useAddFlow } from "./useAddFlow";
import { WhereStep } from "./WhereStep";

// One sheet for both steps, so focus and the open animation don't restart between them.
export function AddSheet() {
  const f = useAddFlow(), { a, people, where } = f, amount = a.step === "amount";
  const who = a.payer === people.me ? C.youLower : people.names[a.payer];
  const saveLabel = where.sel ? saveAt(fmt(f.cents), where.sel === NEW_STORE ? where.q : f.merchants[where.sel]?.name || "") : C.chooseStore;
  return (
    <Sheet title={amount ? C.add : C.whereTitle} step={amount ? C.step1 : C.step2} onClose={f.close}
      banner={a.dup ? <DupAlert text={a.dup} onCancel={f.dontAdd} onOk={f.addAnyway} /> : null}
      context={amount ? null : (
        <p className="ctx text-caption text-muted-foreground">{paidByLine(fmt(f.cents), who)} ·{" "}
          <Button variant="link" className="h-11 px-1 text-body" data-act="back-amount" onClick={f.back}>{C.editAmount}</Button></p>
      )}
      actions={amount ? (
        <>
          <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="close" onClick={f.close}>{C.cancel}</Button>
          <Button size="lg" className="h-13 min-w-0 flex-[2] text-body" data-act="next" aria-disabled={a.checking || undefined} onClick={() => void f.next()}>
            <span className="truncate">{a.checking ? C.checking : a.bill ? billNext(a.bill.name, fmt(f.cents)) : C.nextStore}</span></Button>
        </>
      ) : (
        <>
          <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="back-amount" onClick={f.back}>{C.back}</Button>
          <Button id="w-save" size="lg" className="h-13 min-w-0 flex-[2] text-body" data-act="save-where" onClick={f.saveWhere}>
            <span className="truncate">{saveLabel}</span></Button>
        </>
      )}>
      {amount ? <AmountStep f={f} /> : <WhereStep f={f} />}
    </Sheet>
  );
}
