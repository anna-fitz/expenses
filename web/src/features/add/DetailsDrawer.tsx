import { BottomDrawer } from "@/components/BottomDrawer";
import { Choice } from "@/components/Choice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Expense } from "@/data/types";
import { categoryChoice, categoryOptions, categoryValue } from "@/domain/categories";
import { C, splitHelp, todayISO } from "@/domain/copy.js";
import type { AddFlow, DetailsField } from "./useAddFlow";

type Split = Expense["split"];
// Opening from a review row starts on that row's field.
const START: Record<Exclude<DetailsField, null>, string> = {
  note: "#o-note", payer: "input[name=payer]:checked", split: "input[name=o-split]:checked", date: "#o-date", category: "#o-cat", covers: "#o-covers",
};
export function DetailsDrawer({ f }: { f: AddFlow }) {
  const { a, people, storeDefault } = f, other = a.payer === people.a ? people.b : people.a, field = a.details?.field;
  return (
    <BottomDrawer id="details" title={C.details} open={!!a.details} onClose={f.closeDetails} initialFocus={field ? START[field] : undefined}
      footer={<Button size="lg" className="h-13 w-full text-body" data-act="details-done" onClick={f.closeDetails}>{C.done}</Button>}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-2"><Label htmlFor="o-note">{C.note}</Label>
          <Input id="o-note" className="h-11 text-body" placeholder={C.notePh} maxLength={140} value={a.note} onChange={(e) => f.set({ note: e.target.value })} /></div>
        <Choice name="payer" legend={C.paidBy} value={a.payer} onChange={(v) => f.set({ payer: v })}
          options={[{ value: people.me, label: C.you }, { value: people.them, label: people.names[people.them] }]} />
        <div className="grid gap-2">
          <Choice<Split> name="o-split" legend={C.split} value={a.split} describedBy="o-split-help" onChange={(v) => f.set({ split: v })}
            options={[{ value: "half", label: C.splitHalf }, { value: "full", label: C.splitFull }]} />
          <p id="o-split-help" className="text-caption text-muted-foreground">{splitHelp(people.names[other], a.split, f.cents)}</p>
        </div>
        <div className="grid gap-2"><Label htmlFor="o-date">{C.date}</Label>
          <Input id="o-date" type="date" className="h-11 text-body" value={a.date} onChange={(e) => f.set({ date: e.target.value || todayISO() })} /></div>
        <div className="grid gap-2"><Label htmlFor="o-cat">{C.category}</Label>
          <NativeSelect id="o-cat" className="h-11 text-body" value={categoryValue(a.category, storeDefault)}
            onChange={(e) => f.set({ category: categoryChoice(e.target.value, storeDefault) })}>
            {categoryOptions(storeDefault).map((o) => <option key={o.value || "store-default"} value={o.value}>{o.label}</option>)}
          </NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor="o-covers">{C.covers}</Label>
          <Input id="o-covers" className="h-11 text-body" placeholder={C.coversPh} aria-describedby="o-covers-help" value={a.covers}
            onChange={(e) => f.set({ covers: e.target.value })} />
          <p id="o-covers-help" className="text-caption text-muted-foreground">{C.coversHelp}</p></div>
      </div>
    </BottomDrawer>
  );
}
