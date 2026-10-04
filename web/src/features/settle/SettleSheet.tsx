import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { closeSheet } from "@/app/route";
import { BottomDrawer } from "@/components/BottomDrawer";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/data";
import type { Settlement } from "@/data/types";
import { clearPending, readPending, writePending } from "@/data/venmo";
import { recordSettlement } from "@/data/writes";
import { C, confirmBody, confirmTitle, fmt, noVenmo, payVenmo, periodLine, requestVenmo, settleHero, settleNote, todayISO } from "@/domain/copy.js";
import { calc, settleRows } from "@/domain/money";
import { pendingValid, settlementRecord, venmoUrl, type VenmoPending } from "@/domain/settle";
import { cn } from "@/lib/utils";

function VenmoAsk({ txn, onYes, onNo }: { txn: "pay" | "charge"; onYes: () => void; onNo: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div id="v-ask" ref={ref} role="status" tabIndex={-1} className="flex flex-col gap-3 rounded-xl border bg-card p-4 outline-none">
      <p className="font-medium">{txn === "charge" ? C.venmoAskRequest : C.venmoAskPay}</p>
      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="venmo-no" onClick={onNo}>{C.venmoNo}</Button>
        <Button size="lg" className="h-13 flex-[2] text-body" data-act="venmo-yes" onClick={onYes}>{C.venmoYes}</Button>
      </div>
    </div>
  );
}

// Settle up: who owes whom, the period, the math one tap away, Venmo first, and any other way behind a confirm drawer.
// Back from Venmo, it asks once whether the payment went through; Yes is the confirmation.
export function SettleSheet() {
  const { people, expenses, profiles, loaded } = useData(), { me, them, a, b, names } = people;
  const [confirmOpen, setConfirmOpen] = useState(false), [showMath, setShowMath] = useState(false);
  const [ask, setAsk] = useState<VenmoPending | null>(null), [changed, setChanged] = useState(false);
  const done = useRef(false), saving = useRef(false), hadExpenses = useRef(false);
  const expensesRef = useRef(expenses); expensesRef.current = expenses;
  const close = () => closeSheet("#/");
  const count = expenses.length, t = calc(expenses, a, b), even = t.net === 0;
  const rec = count ? settlementRecord(expenses, a, b, me, todayISO()) : null;
  const iOwe = rec?.from === me, txn: "pay" | "charge" = iOwe ? "pay" : "charge", theirVenmo = profiles[them]?.venmo || null;
  useEffect(() => {
    if (!loaded || done.current) return;
    if (count) { hadExpenses.current = true; return; }
    done.current = true;
    close();
    if (hadExpenses.current) toast(C.alreadySettled);
  }, [loaded, count]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Back from Venmo: ask while the pending payment still matches what's unsettled; clear it silently otherwise.
  useEffect(() => {
    if (!loaded) return;
    const check = () => {
      if (document.visibilityState !== "visible" || done.current) return;
      const p = readPending();
      if (!p) return;
      if (pendingValid(p, expensesRef.current, a, b, Date.now())) { setAsk(p); setChanged(false); } else clearPending();
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [loaded, a, b]);
  // The balance moved while the question was up: withdraw it rather than settle something nobody paid.
  useEffect(() => {
    if (ask && count && !pendingValid(ask, expenses, a, b, Date.now())) { setAsk(null); clearPending(); setChanged(true); }
  }, [ask, expenses, count, a, b]);
  const record = (method: "venmo" | null) => {
    if (saving.current) return;
    saving.current = true; done.current = true;
    recordSettlement(expensesRef.current, people, method);
    clearPending(); setConfirmOpen(false); close(); toast(C.settled);
  };
  if (!rec) return null;
  const amount = fmt(Math.abs(t.net)), note = settleNote(rec.periodStart, rec.periodEnd), main = "h-13 w-full text-body";
  return (
    <Sheet title={C.settleUp} onClose={close}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={close}>{C.cancel}</Button>}>
      <div className="flex flex-col gap-1 py-4">
        <p id="s-who" className="text-body text-muted-foreground">{settleHero(t.net, me, a, b, names)}</p>
        <p id="s-amt" className="text-hero tabular-nums">{amount}</p>
        <p id="s-period" className="text-caption text-muted-foreground">{periodLine(count, rec.periodStart, rec.periodEnd)}</p>
      </div>
      <div className="flex flex-col items-start gap-2">
        <Button type="button" variant="link" className="h-11 px-0 text-body" data-act="how" aria-expanded={showMath} aria-controls="s-math" onClick={() => setShowMath(!showMath)}>
          {C.howWeGot}<ChevronDown className={cn("size-4 transition-transform", showMath && "rotate-180")} aria-hidden="true" />
        </Button>
        <dl id="s-math" className={showMath ? "math w-full rounded-xl border bg-card p-4" : "hidden"}>
          {settleRows({ id: "", ...rec } as Settlement, a, b, names).map((r, i) => (
            <div key={i} className={cn("r flex justify-between gap-3 py-1.5", r.total && "total mt-1 border-t pt-3 font-medium")}>
              <dt>{r.label}</dt><dd className="tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {changed && <p id="v-changed" role="alert" className="text-caption text-destructive">{C.venmoChanged}</p>}
      {ask ? (
        <VenmoAsk txn={ask.txn} onYes={() => record("venmo")} onNo={() => { clearPending(); setAsk(null); }} />
      ) : (
        <div className="flex flex-col gap-3">
          {!even && theirVenmo && (
            <Button asChild size="lg" className={main}>
              <a data-act="venmo" href={venmoUrl(theirVenmo, txn, Math.abs(t.net), note)} target="_blank" rel="noopener"
                onClick={() => { writePending({ net: t.net, count, at: Date.now(), txn }); setChanged(false); }}>
                {iOwe ? payVenmo(names[them]) : requestVenmo(names[them])}</a>
            </Button>
          )}
          {!even && !theirVenmo && <p id="s-novenmo" className="text-body text-muted-foreground">{noVenmo(names[them])}</p>}
          <Button size="lg" variant={!even && theirVenmo ? "outline" : "default"} className={main} data-act="settle-other" onClick={() => setConfirmOpen(true)}>
            {even ? C.closePeriod : C.paidOther}</Button>
        </div>
      )}
      <BottomDrawer id="settle-confirm" title={confirmTitle(even ? "even" : txn, names[them], amount)} description={confirmBody(count)}
        open={confirmOpen} onClose={() => setConfirmOpen(false)}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="settle-no" onClick={() => setConfirmOpen(false)}>{C.venmoNo}</Button>
            <Button size="lg" className="h-13 flex-[2] text-body" data-act="settle-yes" onClick={() => record(null)}>{even ? C.yesClose : C.venmoYes}</Button>
          </div>
        }>{null}</BottomDrawer>
    </Sheet>
  );
}
