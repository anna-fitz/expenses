import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { closeSheet } from "@/app/route";
import { Choice } from "@/components/Choice";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useData } from "@/data/data";
import type { Expense, Merchant, Person } from "@/data/types";
import { deleteExpense, editExpense } from "@/data/writes";
import { MAX_CENTS, centsToBuf, toCents } from "@/domain/amount";
import { CATEGORIES } from "@/domain/categories";
import { C, todayISO } from "@/domain/copy.js";
import { canonicalName } from "@/domain/stores.js";

type Split = Expense["split"];
type Form = { amt: string; payer: Person; store: string; category: string; date: string; split: Split; note: string; covers: string };
type Field = "e-amt" | "e-store";
const formOf = (e: Expense, merchants: Record<string, Merchant>): Form => ({ amt: centsToBuf(e.amountCents), payer: e.payer,
  store: canonicalName(merchants, e.merchant), category: e.category, date: e.date, split: e.split || "half", note: e.note || "", covers: e.covers || "" });

// The full form, the rare path. Opened from a Home row or the "Edit" button on the saved toast.
export function EditSheet({ id }: { id: string }) {
  const { expenses, merchants, people, loaded } = useData(), orig = expenses.find((e) => e.id === id);
  const [f, setF] = useState<Form | null>(() => (orig ? formOf(orig, merchants) : null));
  const [err, setErr] = useState<{ msg: string; field: Field } | null>(null), [armed, setArmed] = useState(false);
  const done = useRef(false);
  const close = () => closeSheet("#/");
  useEffect(() => { if (orig && !f) setF(formOf(orig, merchants)); }, [orig, f, merchants]);   // opened by a link before data arrived
  // Deleted or settled on the other phone while open, or a stale link: close and say so. Never after our own save or delete.
  useEffect(() => {
    if (loaded && !orig && !done.current) { done.current = true; close(); toast(C.editGone); }
  }, [loaded, orig]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!orig || !f) return null;
  const set = (p: Partial<Form>) => setF({ ...f, ...p });
  const inv = (field: Field) => (err?.field === field ? { "aria-invalid": true as const, "aria-describedby": "e-err" } : {});
  // Arrow functions, not declarations: they keep TypeScript's narrowing of `orig` and `f` from the guard above.
  const fail = (msg: string, field: Field) => { setErr({ msg, field }); requestAnimationFrame(() => document.getElementById(field)?.focus()); };
  // `done` also guards against a second tap before the sheet closes: each tap would write (and log) again.
  const save = () => {
    if (done.current) return;
    const c = toCents(f.amt), name = f.store.trim().replace(/\s+/g, " ");
    if (!c || c > MAX_CENTS) return fail(C.amountLike, "e-amt");
    if (!name) return fail(C.needStore, "e-store");
    done.current = true;
    const changed = editExpense(orig, { amountCents: c, payer: f.payer, merchant: name.slice(0, 80), category: f.category, date: f.date || todayISO(),
      split: f.split, note: f.note.trim().slice(0, 140), covers: f.covers.trim().slice(0, 60) }, people.me, merchants);
    close();
    toast(changed ? C.changesSaved : C.noChanges);
  };
  const del = () => {
    if (done.current) return;
    if (!armed) return setArmed(true);
    done.current = true;
    deleteExpense(orig, people.me);
    close();
    toast(C.deleted);
  };
  const cats = CATEGORIES.includes(f.category) ? CATEGORIES : [...CATEGORIES, f.category];
  return (
    <Sheet title={C.editTitle} onClose={close}
      headerAction={<Button variant="ghost" className="h-11 text-body" data-act="close" onClick={close}>{C.cancel}</Button>}
      actions={<>
        <Button id="e-del" variant="destructive" size="lg" className="h-13 flex-1 text-body" data-act="e-delete" onClick={del}>{armed ? C.delConfirm : C.del}</Button>
        <Button size="lg" className="h-13 flex-[2] text-body" data-act="e-save" onClick={save}>{C.saveChanges}</Button>
      </>}>
      <div className="grid gap-2"><Label htmlFor="e-amt">{C.amount}</Label>
        <Input id="e-amt" inputMode="decimal" className="h-11 text-body tabular-nums" value={f.amt} onChange={(e) => set({ amt: e.target.value })} {...inv("e-amt")} /></div>
      {err && <p id="e-err" role="alert" className="text-caption text-destructive">{err.msg}</p>}
      <Choice name="e-payer" legend={C.paidBy} value={f.payer} onChange={(v) => set({ payer: v })}
        options={[{ value: people.me, label: C.you }, { value: people.them, label: people.names[people.them] }]} />
      <div className="grid gap-2"><Label htmlFor="e-store">{C.store}</Label>
        <Input id="e-store" autoCapitalize="words" className="h-11 text-body" value={f.store} onChange={(e) => set({ store: e.target.value })} {...inv("e-store")} /></div>
      <div className="grid gap-2"><Label htmlFor="e-cat">{C.category}</Label>
        <NativeSelect id="e-cat" className="h-11 text-body" value={f.category} onChange={(e) => set({ category: e.target.value })}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="e-date">{C.date}</Label>
        <Input id="e-date" type="date" className="h-11 text-body" value={f.date} onChange={(e) => set({ date: e.target.value })} /></div>
      <Choice<Split> name="e-split" legend={C.split} value={f.split} onChange={(v) => set({ split: v })}
        options={[{ value: "half", label: C.splitHalf }, { value: "full", label: C.splitFull }]} />
      <div className="grid gap-2"><Label htmlFor="e-note">{C.note}</Label>
        <Input id="e-note" className="h-11 text-body" value={f.note} onChange={(e) => set({ note: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="e-covers">{C.covers}</Label>
        <Input id="e-covers" className="h-11 text-body" placeholder={C.coversPh} value={f.covers} onChange={(e) => set({ covers: e.target.value })} /></div>
    </Sheet>
  );
}
