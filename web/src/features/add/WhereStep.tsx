import { Check, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SORTED_CATEGORIES } from "@/domain/categories";
import { C, addNewStore, categoryFor, dateLabel, optsSummary, storeSelected, storeSub } from "@/domain/copy.js";
import { NEW_STORE } from "@/domain/expenses";
import { cn } from "@/lib/utils";
import type { AddFlow } from "./useAddFlow";

export function WhereStep({ f }: { f: AddFlow }) {
  const { a, where, target } = f;
  const tiles = [
    ...(where.q && !where.exact ? [{ id: NEW_STORE, label: addNewStore(where.q), sub: "" }] : []),
    ...where.list.map((m) => ({ id: m.id, label: m.name, sub: storeSub(m.category, m.alsoCalled) })),
  ];
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="w-q">{C.store}</Label>
        <Input id="w-q" className="h-11 text-body" placeholder={C.storeSearch} autoComplete="off" autoCapitalize="words" value={a.q}
          aria-describedby={target ? "w-selected" : undefined}
          onChange={(e) => f.set({ q: e.target.value, err: "", errField: null })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); f.enterInSearch(); } }} />
        {target && (
          <p id="w-selected" className="flex items-center gap-1 text-caption text-muted-foreground">
            <Check className="size-4" aria-hidden="true" /><span>{storeSelected(target.name)}</span> ·
            <Button variant="link" className="h-11 px-1 text-body" data-act="clear-store" onClick={f.clearStore}>{C.clear}</Button>
          </p>
        )}
      </div>
      {/* The note is one tap away above the tiles, so it never pushes the store list down until it's wanted. */}
      {a.noteOpen || a.note ? (
        <div className="grid gap-2">
          <Label htmlFor="w-note">{C.note}</Label>
          <Input id="w-note" className="h-11 text-body" placeholder={C.notePh} maxLength={140} value={a.note} onChange={(e) => f.set({ note: e.target.value })} />
        </div>
      ) : (
        <Button type="button" variant="link" className="h-11 self-start px-0 text-body" data-act="add-note" onClick={f.openNote}>
          <Plus className="size-4" aria-hidden="true" />{C.addNote}</Button>
      )}
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
                  {/* Tapping the selected tile again unselects it; "Clear" above is the keyboard path. */}
                  <input type="radio" name="store" value={t.id} checked={where.sel === t.id}
                    onClick={() => { if (where.sel === t.id) f.pickStore(null); }} onChange={() => f.pickStore(t.id)}
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
              {SORTED_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" className="h-11 w-full justify-between text-body" data-act="details" aria-describedby="w-sum" onClick={() => f.openDetails(null)}>
          <span>{C.details}</span><ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <p id="w-sum" className="text-caption text-muted-foreground">{optsSummary(dateLabel(a.date), a.split, a.category)}</p>
      </div>
    </>
  );
}
