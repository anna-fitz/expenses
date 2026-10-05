import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { closeSheet } from "@/app/route";
import { BottomDrawer } from "@/components/BottomDrawer";
import { Choice } from "@/components/Choice";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useData } from "@/data/data";
import { addBill, editBill, setBillActive } from "@/data/lists";
import { MAX_CENTS, centsToBuf, toCents } from "@/domain/amount";
import { SORTED_CATEGORIES } from "@/domain/categories";
import { C, retireTitle } from "@/domain/copy.js";
import { billNameError } from "@/domain/lists";

type Field = "bf-name" | "bf-amt";
// Add or edit a bill: a form you finish with Save. A new bill starts on Utilities and on member b as its usual payer,
// as in the current app.
export function BillSheet({ id }: { id: string }) {
  const { people, bills, merchants } = useData(), orig = id === "new" ? null : bills.find((b) => b.id === id) || null;
  const close = () => closeSheet("#/settings/bills");
  const [f, setF] = useState(() => ({ name: orig?.name || "", amt: orig ? centsToBuf(orig.usualCents) : "", category: orig?.category || "Utilities", payer: orig?.payer || people.b }));
  const [err, setErr] = useState<{ msg: string; field: Field } | null>(null), [retireOpen, setRetireOpen] = useState(false), saving = useRef(false);
  useEffect(() => { if (id !== "new" && bills.length && !orig && !saving.current) close(); }, [bills, orig]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (id !== "new" && !orig) return null;
  const set = (p: Partial<typeof f>) => { setF({ ...f, ...p }); setErr(null); };
  const inv = (field: Field) => (err?.field === field ? { "aria-invalid": true as const, "aria-describedby": "bf-err" } : {});
  const fail = (msg: string, field: Field) => { setErr({ msg, field }); requestAnimationFrame(() => document.getElementById(field)?.focus()); };
  const save = () => {
    if (saving.current) return;
    const name = f.name.trim().replace(/\s+/g, " "), cents = toCents(f.amt);
    const nameErr = billNameError(name, bills, merchants, orig?.id);
    if (nameErr) return fail(nameErr, "bf-name");
    if (!cents || cents > MAX_CENTS) return fail(C.enterBillAmount, "bf-amt");
    saving.current = true;
    const data = { name: name.slice(0, 80), usualCents: cents, category: f.category, payer: f.payer };
    if (!orig) addBill(bills, data, people.me);
    else if (!editBill(orig, data, people.me)) { close(); toast(C.noChanges); return; }
    close(); toast(C.billSaved);
  };
  const cats = SORTED_CATEGORIES.includes(f.category) ? SORTED_CATEGORIES : [...SORTED_CATEGORIES, f.category];
  return (
    <Sheet title={orig ? orig.name : C.addBill} onClose={close}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={close}>{C.cancel}</Button>}
      actions={<Button size="lg" className="h-13 w-full text-body" data-act="bill-save" onClick={save}>{C.save}</Button>}>
      {err && <p id="bf-err" role="alert" className="text-caption text-destructive">{err.msg}</p>}
      <div className="grid gap-2"><Label htmlFor="bf-name">{C.nameLabel}</Label>
        <Input id="bf-name" className="h-11 text-body" autoComplete="off" autoCapitalize="words" value={f.name} onChange={(e) => set({ name: e.target.value })} {...inv("bf-name")} /></div>
      <div className="grid gap-2"><Label htmlFor="bf-amt">{C.usualAmount}</Label>
        <Input id="bf-amt" className="h-11 text-body tabular-nums" inputMode="decimal" placeholder="64.50" value={f.amt} onChange={(e) => set({ amt: e.target.value })} {...inv("bf-amt")} /></div>
      <div className="grid gap-2"><Label htmlFor="bf-cat">{C.category}</Label>
        <NativeSelect id="bf-cat" className="h-11 text-body" value={f.category} onChange={(e) => set({ category: e.target.value })}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect></div>
      <Choice name="bf-payer" legend={C.usuallyPaidBy} value={f.payer} onChange={(v) => set({ payer: v })}
        options={[{ value: people.me, label: C.you }, { value: people.them, label: people.names[people.them] }]} />
      {orig && (orig.active === false
        ? <Button variant="outline" size="lg" className="h-11 text-body" data-act="bill-restore"
            onClick={() => { saving.current = true; setBillActive(orig, true, people.me); close(); toast(C.billBack); }}>{C.bringBack}</Button>
        : <Button variant="outline" size="lg" className="h-11 text-body text-destructive" data-act="bill-retire" onClick={() => setRetireOpen(true)}>{C.retireBill}</Button>)}
      {orig && (
        <BottomDrawer id="retire" title={retireTitle(orig.name)} description={C.retireHelp} open={retireOpen} onClose={() => setRetireOpen(false)}
          footer={
            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="retire-cancel" onClick={() => setRetireOpen(false)}>{C.venmoNo}</Button>
              <Button variant="destructive" size="lg" className="h-13 flex-[2] text-body" data-act="bill-retire-yes"
                onClick={() => { saving.current = true; setBillActive(orig, false, people.me); setRetireOpen(false); close(); toast(C.billRetired); }}>{C.retireBill}</Button>
            </div>
          }>{null}</BottomDrawer>
      )}
    </Sheet>
  );
}
