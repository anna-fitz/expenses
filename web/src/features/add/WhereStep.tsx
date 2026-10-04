import { Check, ChevronDown } from "lucide-react";
import { Choice } from "@/components/Choice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Expense } from "@/data/types";
import { CATEGORIES } from "@/domain/categories";
import { C, addNewStore, categoryFor, optsSummary, shortDate, splitHelp, storeSub, todayISO } from "@/domain/copy.js";
import { NEW_STORE } from "@/domain/expenses";
import { cn } from "@/lib/utils";
import type { AddFlow } from "./useAddFlow";

type Split = Expense["split"];
export function WhereStep({ f }: { f: AddFlow }) {
  const { a, where, people } = f, other = a.payer === people.a ? people.b : people.a;
  const summary = optsSummary(a.date === todayISO() ? "Today" : shortDate(a.date), a.split, a.category);
  const tiles = [
    ...(where.q && !where.exact ? [{ id: NEW_STORE, label: addNewStore(where.q), sub: "" }] : []),
    ...where.list.map((m) => ({ id: m.id, label: m.name, sub: storeSub(m.category, m.alsoCalled) })),
  ];
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="w-q">{C.store}</Label>
        <Input id="w-q" className="h-11 text-body" placeholder={C.storeSearch} autoComplete="off" autoCapitalize="words" value={a.q}
          onChange={(e) => f.set({ q: e.target.value, err: "", errField: null })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); f.enterInSearch(); } }} />
      </div>
      <Button type="button" variant="outline" className="details h-11 justify-between text-body font-normal" data-act="toggle-opts"
        aria-expanded={a.showOpts} aria-controls="w-opts" onClick={() => f.set({ showOpts: !a.showOpts })}>
        <span className="truncate">{C.details}: <span id="w-sum">{summary}</span></span>
        <ChevronDown className={cn("size-4 transition-transform", a.showOpts && "rotate-180")} aria-hidden="true" />
      </Button>
      <div id="w-opts" className={a.showOpts ? "flex flex-col gap-4 rounded-xl border bg-card p-4" : "hidden"}>
        <div className="grid gap-2"><Label htmlFor="o-date">{C.date}</Label>
          <Input id="o-date" type="date" className="h-11 text-body" value={a.date} onChange={(e) => f.set({ date: e.target.value || todayISO() })} /></div>
        <div className="grid gap-2">
          <Choice<Split> name="o-split" legend={C.split} value={a.split} describedBy="o-split-help" onChange={(v) => f.set({ split: v })}
            options={[{ value: "half", label: C.splitHalf }, { value: "full", label: C.splitFull }]} />
          <p id="o-split-help" className="text-caption text-muted-foreground">{splitHelp(people.names[other], a.split, f.cents)}</p>
        </div>
        <div className="grid gap-2"><Label htmlFor="o-cat">{C.category}</Label>
          <NativeSelect id="o-cat" className="h-11 text-body" value={a.category} onChange={(e) => f.set({ category: e.target.value })}>
            <option value="">{C.usualCategory}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor="o-note">{C.note}</Label>
          <Input id="o-note" className="h-11 text-body" placeholder={C.notePh} value={a.note} onChange={(e) => f.set({ note: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="o-covers">{C.covers}</Label>
          <Input id="o-covers" className="h-11 text-body" placeholder={C.coversPh} aria-describedby="o-covers-help" value={a.covers}
            onChange={(e) => f.set({ covers: e.target.value })} />
          <p id="o-covers-help" className="text-caption text-muted-foreground">{C.coversHelp}</p></div>
      </div>
      {a.err && <p id="w-err" role="alert" className="text-caption text-destructive">{a.err}</p>}
      <div id="w-list" className="flex flex-col gap-4">
        {tiles.length ? (
          <fieldset aria-describedby={a.errField === "store" ? "w-err" : undefined}>
            <legend className="sr-only">{C.chooseStore}</legend>
            <div className="grid grid-cols-2 gap-2">
              {tiles.map((t) => (
                <label key={t.id} className={cn("group relative flex min-h-15 flex-col justify-center rounded-[14px] border bg-card py-3 pr-9 pl-4",
                  "has-[:checked]:border-foreground has-[:checked]:ring-1 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  t.id === NEW_STORE && "border-dashed")}>
                  <input type="radio" name="store" value={t.id} checked={where.sel === t.id} onChange={() => f.pickStore(t.id)}
                    className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-[14px] opacity-0" />
                  <span className="name font-medium">{t.label}</span>
                  {t.sub && <span className="text-caption text-muted-foreground">{t.sub}</span>}
                  <Check className="absolute top-3 right-3 hidden size-4 group-has-[:checked]:block" aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>
        ) : <p className="text-muted-foreground">{C.typeToAdd}</p>}
        {where.sel === NEW_STORE && (
          <div className="grid gap-2">
            <Label htmlFor="w-cat">{categoryFor(where.q)}</Label>
            <NativeSelect id="w-cat" className="h-11 text-body" value={a.newCat} aria-invalid={a.errField === "cat" || undefined}
              aria-describedby={a.errField === "cat" ? "w-err" : undefined} onChange={(e) => f.set({ newCat: e.target.value, err: "", errField: null })}>
              <option value="">{C.chooseCategory}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
        )}
      </div>
    </>
  );
}
