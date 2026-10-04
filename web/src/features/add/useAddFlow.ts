import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { closeSheet, openSheet } from "@/app/route";
import { actionToast } from "@/components/ActionToast";
import { announce } from "@/components/Announcer";
import { useData } from "@/data/data";
import type { Bill, Expense, Person } from "@/data/types";
import { addExpense, learnStore, undoAdd } from "@/data/writes";
import { amountText, centsToBuf, pressKey, toCents } from "@/domain/amount";
import { C, fmt, pickCategoryFor, savedLine, todayISO } from "@/domain/copy.js";
import { NEW_STORE } from "@/domain/expenses";
import { pickerStores } from "@/domain/stores.js";

export type AddState = {
  step: "amount" | "where"; buf: string; payer: Person; bill: Bill | null;
  q: string; sel: string | null; newCat: string; showOpts: boolean;
  date: string; split: Expense["split"]; category: string; note: string; covers: string;
  err: string; errField: "amount" | "store" | "cat" | null;
};
export type SetAdd = (patch: Partial<AddState>) => void;
export type AddFlow = ReturnType<typeof useAddFlow>;
const focusSoon = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());

export function useAddFlow() {
  const { people, bills, merchants } = useData();
  const [a, setA] = useState<AddState>(() => ({ step: "amount", buf: "", payer: people.me, bill: null, q: "", sel: null, newCat: "",
    showOpts: false, date: todayISO(), split: "half", category: "", note: "", covers: "", err: "", errField: null }));
  const aRef = useRef(a); aRef.current = a;
  const saving = useRef(false);
  const set: SetAdd = (p) => setA((x) => ({ ...x, ...p }));
  const cents = toCents(a.buf) || 0;

  // The store step's list, and the selection only while it's still on screen.
  const where = useMemo(() => {
    const q = a.q.trim().replace(/\s+/g, " "), list = pickerStores(merchants, q), exact = list.find((m) => m.exact) || null;
    const ok = a.sel === NEW_STORE ? !!q && !exact : list.some((m) => m.id === a.sel);
    return { q, list, exact, sel: ok ? a.sel : null };
  }, [a.q, a.sel, merchants]);
  const whereRef = useRef(where); whereRef.current = where;
  useEffect(() => { if (a.sel && !where.sel) setA((x) => ({ ...x, sel: null })); }, [a.sel, where.sel]);   // never keep a hidden selection

  const close = () => closeSheet("#/");
  function save(name: string, category: string, extra: { billId?: string; covers?: string; unhide?: boolean } = {}) {
    if (saving.current) return;
    saving.current = true;
    const cur = aRef.current, amountCents = toCents(cur.buf) || 0;
    const e = addExpense({ amountCents, payer: cur.payer, merchant: name, category: cur.category || category || "Other", date: cur.date || todayISO(),
      split: cur.split, note: cur.note.trim(), covers: (extra.covers || cur.covers).trim(), billId: extra.billId || null }, people.me);
    learnStore(merchants, name, e.category, !!extra.unhide);
    const bill = extra.billId ? bills.find((x) => x.id === extra.billId) : undefined;
    const over = bill && bill.usualCents && amountCents > bill.usualCents * 1.2 ? fmt(bill.usualCents) : null;
    close();
    actionToast(savedLine(fmt(amountCents), e.merchant, bill ? { name: bill.name, overUsual: over } : null), [
      { act: "undo", label: C.undo, run: () => { undoAdd(e.id); toast(C.removed); } },
      { act: "edit", label: C.edit, run: () => openSheet(`#/edit/${encodeURIComponent(e.id)}`) },
    ]);
  }
  function key(k: string) {
    const buf = pressKey(aRef.current.buf, k);
    set({ buf, err: "", errField: null });
    announce(`${C.amount} ${amountText(buf)}`, 500);
  }
  function next() {
    const cur = aRef.current;
    if (!toCents(cur.buf)) { set({ err: C.enterAmount, errField: "amount" }); return; }
    if (cur.bill) return save(cur.bill.name, cur.bill.category || "Utilities", { billId: cur.bill.id, covers: new Date().toLocaleDateString("en-US", { month: "long" }) });
    set({ step: "where", err: "", errField: null });
  }
  const pickBill = (b: Bill) => set({ bill: b, payer: b.payer || people.b, buf: centsToBuf(b.usualCents), err: "", errField: null });
  const clearBill = () => { set({ bill: null, buf: "", payer: people.me }); focusSoon("#layer-title"); };
  const pickStore = (value: string) =>
    set({ sel: value, err: "", errField: null, ...(value === NEW_STORE ? { newCat: aRef.current.newCat || aRef.current.category } : {}) });
  function saveWhere() {
    if (saving.current) return;
    const cur = aRef.current, w = whereRef.current;
    if (!w.sel) {
      set({ err: C.pickStore, errField: "store" });
      focusSoon(document.querySelector("#w-list input[name=store]") ? "#w-list input[name=store]" : "#w-q");
      return;
    }
    let name: string, category: string;
    if (w.sel === NEW_STORE) {
      name = w.q;
      if (!cur.newCat) { set({ err: pickCategoryFor(name), errField: "cat" }); focusSoon("#w-cat"); return; }
      category = cur.newCat;
    } else {
      const m = merchants[w.sel]; if (!m) return;
      name = m.name; category = m.category || "";
    }
    save(name, category, w.sel === NEW_STORE ? { unhide: true } : {});
  }
  // Enter in the search box: first selects (the exact match, or "add new"), then saves.
  function enterInSearch() {
    const w = whereRef.current, cur = aRef.current;
    if (!w.q) return;
    const want = w.exact ? w.exact.id : NEW_STORE;
    if (w.sel === want && (want !== NEW_STORE || cur.newCat)) return saveWhere();
    set({ sel: want, newCat: want === NEW_STORE ? cur.newCat || cur.category : cur.newCat, err: "", errField: null });
    if (want === NEW_STORE) focusSoon("#w-cat");
  }
  // The number pad also answers the keyboard on the amount step.
  const handlers = useRef({ key, next }); handlers.current = { key, next };
  useEffect(() => {
    if (a.step !== "amount") return;
    const h = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || t.closest("input, select, textarea")) return;
      if (/^[0-9.]$/.test(ev.key)) { handlers.current.key(ev.key); ev.preventDefault(); }
      else if (ev.key === "Backspace") { handlers.current.key("back"); ev.preventDefault(); }
      else if (ev.key === "Enter" && !t.closest("button, a")) { handlers.current.next(); ev.preventDefault(); }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [a.step]);

  return { a, set, cents, where, people, bills, merchants, key, next, pickBill, clearBill, pickStore, saveWhere, enterInSearch, close,
    back: () => set({ step: "amount", err: "", errField: null }) };
}
