import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { C, fmt } from "@/domain/copy.js";
import { AmountStep } from "./AmountStep";
import { BillsDrawer } from "./BillsDrawer";
import { DetailsDrawer } from "./DetailsDrawer";
import { DupAlert } from "./DupAlert";
import { ReviewStep } from "./ReviewStep";
import { useAddFlow } from "./useAddFlow";
import { WhereStep } from "./WhereStep";

// One sheet for every step, so focus and the open animation don't restart between them.
export function AddSheet() {
  const f = useAddFlow(), { a } = f;
  const title = a.step === "amount" ? C.add : a.step === "where" ? C.whereTitle : C.reviewTitle;
  const side = "h-13 flex-1 text-body", main = "h-13 min-w-0 flex-[2] text-body";
  const actions = a.step === "amount" ? (
    <>
      <Button size="lg" className={main} data-act="next" onClick={f.next}>{C.next}</Button>
    </>
  ) : a.step === "where" ? (
    <>
      <Button variant="outline" size="lg" className={side} data-act="back" onClick={f.back}>{C.back}</Button>
      <Button id="w-next" size="lg" className={main} data-act="next" onClick={f.next}>{C.next}</Button>
    </>
  ) : (
    <>
      <Button variant="outline" size="lg" className={side} data-act="back" onClick={f.back}>{C.back}</Button>
      <Button id="log-btn" size="lg" className={main} data-act="log" aria-disabled={a.checking || undefined} onClick={() => void f.log()}>
        {a.checking ? C.checking : C.log}</Button>
    </>
  );
  return (
    <Sheet title={title} onClose={f.close} actions={actions}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={f.close}>{C.cancel}</Button>}
      banner={a.dup ? <DupAlert text={a.dup} onCancel={f.dontAdd} onOk={f.addAnyway} /> : null}
      context={a.step === "where" ? (
        <p className="ctx text-caption text-muted-foreground"><span className="tabular-nums">{fmt(f.cents)}</span> ·{" "}
          <Button variant="link" className="h-11 px-1 text-body" data-act="back-amount" onClick={() => f.jump("amount")}>{C.editAmount}</Button></p>
      ) : null}>
      {a.step === "amount" ? <AmountStep f={f} /> : a.step === "where" ? <WhereStep f={f} /> : <ReviewStep f={f} />}
      <BillsDrawer f={f} />
      <DetailsDrawer f={f} />
    </Sheet>
  );
}
