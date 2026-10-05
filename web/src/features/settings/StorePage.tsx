import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { BottomDrawer } from "@/components/BottomDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useData } from "@/data/data";
import { mergeStore, removeStore, renameStore, setStoreCategory, type RenamePlan } from "@/data/lists";
import { billNamed, withoutBills } from "@/domain/bills";
import { SORTED_CATEGORIES } from "@/domain/categories";
import { C, mergeHelp, mergeInto, mergeTitle, removeTitle, storeExists, storeIsBill } from "@/domain/copy.js";
import { pickerStores, planRename } from "@/domain/stores.js";
import { cn } from "@/lib/utils";
import { SettingsPage } from "./SettingsPage";

const focusSoon = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());
const toList = () => location.replace("#/settings/stores");

export function StorePage({ id }: { id: string }) {
  const { people, merchants, bills } = useData(), m = merchants[id];
  const visible = !!(m && m.name && !m.hidden && !m.mergedInto);
  const [name, setName] = useState(m?.name || ""), [err, setErr] = useState(""), [conflict, setConflict] = useState<{ id: string; name: string } | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false), [mq, setMq] = useState(""), [target, setTarget] = useState<string | null>(null), [mergeErr, setMergeErr] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false), done = useRef(false);
  useEffect(() => { if (m?.name) setName(m.name); }, [m?.name]);
  // Merged, removed or renamed on the other phone, or a stale link: the list, not an empty page.
  useEffect(() => { if (Object.keys(merchants).length && !visible && !done.current) toList(); }, [merchants, visible]);
  if (!visible) return null;
  const fail = (msg: string) => { setErr(msg); focusSoon("#sd-name"); };
  const merge = (targetId: string) => { done.current = true; mergeStore(merchants, id, targetId, people.me); toast(C.storesMerged); toList(); };
  function rename() {
    setErr(""); setConflict(null);
    const plan = planRename(merchants, id, name) as RenamePlan;
    if (plan.kind === "empty") return fail(C.enterName);
    if (billNamed(bills, name)) return fail(storeIsBill(name.trim().replace(/\s+/g, " ")));   // before any merge is offered
    if (plan.kind === "conflict") { setConflict({ id: plan.targetId, name: plan.targetName }); focusSoon("[data-act=store-merge-into]"); return; }
    if (plan.name === m.name) return;
    const next = renameStore(merchants, id, plan, people.me);
    toast(C.storeRenamed);
    if (next !== id) { done.current = true; location.replace(`#/settings/stores/${encodeURIComponent(next)}`); }
  }
  const options = withoutBills(pickerStores(merchants, mq), bills).filter((s) => s.id !== id);
  const cats = SORTED_CATEGORIES.includes(m.category || "Other") ? SORTED_CATEGORIES : [...SORTED_CATEGORIES, m.category as string];
  const tryMerge = () => {
    if (!target || !options.some((s) => s.id === target)) {
      setMergeErr(true);
      focusSoon(document.querySelector("#merge input[name=merge-target]") ? "#merge input[name=merge-target]" : "#sm-q");
      return;
    }
    merge(target);
  };
  return (
    <SettingsPage title={m.name} back={{ href: "#/settings/stores", label: C.stores }}>
      <div className="grid gap-2">
        <Label htmlFor="sd-name">{C.nameLabel}</Label>
        <div className="flex gap-2">
          <Input id="sd-name" className="h-11 text-body" autoComplete="off" autoCapitalize="words" value={name}
            aria-invalid={err ? true : undefined} aria-describedby={err ? "sd-err" : undefined}
            onChange={(e) => { setName(e.target.value); setErr(""); setConflict(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); rename(); } }} />
          <Button variant="outline" className="h-11 text-body" data-act="store-rename" onClick={rename}>{C.save}</Button>
        </div>
        {err && <p id="sd-err" role="alert" className="text-caption text-destructive">{err}</p>}
        {conflict && (
          <div id="sd-conflict" role="status" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <p>{storeExists(conflict.name)}</p>
            <Button className="h-11 text-body" data-act="store-merge-into" onClick={() => merge(conflict.id)}>{mergeInto(conflict.name)}</Button>
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sd-cat">{C.usualCat}</Label>
        <NativeSelect id="sd-cat" className="h-11 text-body" value={m.category || "Other"}
          onChange={(e) => { if (setStoreCategory(merchants, id, e.target.value, people.me)) toast(C.categorySaved); }}>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-3">
        <Button variant="outline" size="lg" className="h-11 text-body" data-act="store-merge-open" onClick={() => { setMq(""); setTarget(null); setMergeErr(false); setMergeOpen(true); }}>
          {C.mergeAnother}</Button>
        <Button variant="outline" size="lg" className="h-11 text-body text-destructive" data-act="store-remove" onClick={() => setRemoveOpen(true)}>{C.removeStore}</Button>
      </div>
      <BottomDrawer id="merge" title={mergeTitle(m.name)} description={mergeHelp(m.name)} open={mergeOpen} onClose={() => setMergeOpen(false)}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="merge-cancel" onClick={() => setMergeOpen(false)}>{C.venmoNo}</Button>
            <Button size="lg" className="h-13 min-w-0 flex-[2] text-body" data-act="store-merge" onClick={tryMerge}>
              <span className="truncate">{target && options.some((s) => s.id === target) ? mergeInto(merchants[target].name) : C.pickMerge}</span></Button>
          </div>
        }>
        <div className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="sm-q">{C.searchStores}</Label>
            <Input id="sm-q" className="h-11 text-body" autoComplete="off" value={mq} onChange={(e) => setMq(e.target.value)} />
          </div>
          {mergeErr && <p id="sm-err" role="alert" className="text-caption text-destructive">{C.pickMerge}</p>}
          {options.length ? (
            <fieldset aria-describedby={mergeErr ? "sm-err" : undefined}>
              <legend className="sr-only">{C.pickMerge}</legend>
              <div className="grid grid-cols-2 gap-2">
                {options.map((s) => (
                  <label key={s.id} className={cn("group relative flex min-h-14 flex-col justify-center rounded-[14px] border bg-card py-2 pr-9 pl-4",
                    "has-[:checked]:border-foreground has-[:checked]:ring-1 has-[:checked]:ring-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring")}>
                    <input type="radio" name="merge-target" value={s.id} checked={target === s.id} onChange={() => { setTarget(s.id); setMergeErr(false); }}
                      className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-[14px] opacity-0" />
                    <span className="font-medium">{s.name}</span>
                    {s.category && <span className="text-caption text-muted-foreground">{s.category}</span>}
                    <Check className="absolute top-3 right-3 hidden size-4 group-has-[:checked]:block" aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : <p className="text-muted-foreground">{C.noStores}</p>}
        </div>
      </BottomDrawer>
      <BottomDrawer id="remove" title={removeTitle(m.name)} description={C.removeHelp} open={removeOpen} onClose={() => setRemoveOpen(false)}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="h-13 flex-1 text-body" data-act="remove-cancel" onClick={() => setRemoveOpen(false)}>{C.venmoNo}</Button>
            <Button variant="destructive" size="lg" className="h-13 flex-[2] text-body" data-act="store-remove-yes"
              onClick={() => { done.current = true; removeStore(merchants, id, people.me); toast(C.storeRemoved); toList(); }}>{C.removeStore}</Button>
          </div>
        }>{null}</BottomDrawer>
    </SettingsPage>
  );
}
