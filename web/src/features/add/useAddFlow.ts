import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { closeSheet, openSheet } from "@/app/route";
import { actionToast } from "@/components/ActionToast";
import { announce } from "@/components/Announcer";
import { useData } from "@/data/data";
import type { Bill, Expense, Person } from "@/data/types";
import { addExpense, billMonthDuplicate, learnStore, undoAdd } from "@/data/writes";
import { amountText, centsToBuf, pressKey, toCents } from "@/domain/amount";
import type { StoreDefault } from "@/domain/categories";
import { C, dupLine, fmt, pickCategoryFor, savedLine, shortDate, todayISO } from "@/domain/copy.js";
import { billNamed, withoutBills } from "@/domain/bills";
import { NEW_STORE, storeDuplicate } from "@/domain/expenses";
import { canonicalName, pickerStores } from "@/domain/stores.js";

export type Step = "amount" | "where" | "review";
export type DetailsField = "note" | "payer" | "split" | "date" | "category" | "covers" | "oneoff" | null;
export type AddState = {
  step: Step; seenReview: boolean; buf: string; payer: Person; bill: Bill | null;
  q: string; sel: string | null; newCat: string; note: string;
  date: string; split: Expense["split"]; category: string; covers: string; oneOff: boolean;
  billsOpen: boolean; details: { field: DetailsField } | null;
  err: string; errField: "amount" | "store" | "cat" | null;
  dup: string | null; dupOk: boolean; checking: boolean;
};
export type SetAdd = (patch: Partial<AddState>) => void;
export type AddFlow = ReturnType<typeof useAddFlow>;
const focusSoon = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());
const monthName = () => new Date().toLocaleDateString("en-US", { month: "long" });
// Changing any of these makes it a different expense: drop a shown warning and any check still running.
const DUP_KEYS = new Set(["step", "buf", "bill", "q", "sel", "newCat", "date", "split", "category", "covers"]);
type Hit = { d: Partial<Expense>; kind: "store" | "bill"; name: string };

// Amount → Store → Review → Log expense (a bill skips the store step). One state object, so going back keeps everything.
export function useAddFlow() {
  const { people, bills, merchants, expenses } = useData();
  const [a, setA] = useState<AddState>(() => ({ step: "amount", seenReview: false, buf: "", payer: people.me, bill: null, q: "", sel: null,
    newCat: "", note: "", date: todayISO(), split: "half", category: "", covers: "", oneOff: false, billsOpen: false, details: null, err: "", errField: null,
    dup: null, dupOk: false, checking: false }));
  const aRef = useRef(a); aRef.current = a;
  const saving = useRef(false), seq = useRef(0), closed = useRef(false);
  useEffect(() => () => { closed.current = true; }, []);
  const set: SetAdd = (p) => {
    const clears = Object.keys(p).some((k) => DUP_KEYS.has(k));
    if (clears) {
      seq.current++;
      if (document.getElementById("dup")?.contains(document.activeElement)) focusSoon("[data-act=log], [data-act=next]");
    }
    setA((x) => ({ ...x, ...p, ...(clears ? { dup: null, dupOk: false, checking: false } : {}) }));
  };
  const cents = toCents(a.buf) || 0;

  // The store step's list, and the selection only while it's still on screen.
  const where = useMemo(() => {
    // Bills are their own flow: never in the store list, and a typed bill name can't become a store.
    const q = a.q.trim().replace(/\s+/g, " "), list = withoutBills(pickerStores(merchants, q), bills), exact = list.find((m) => m.exact) || null;
    const bill = billNamed(bills, q);
    const ok = a.sel === NEW_STORE ? !!q && !exact && !bill : list.some((m) => m.id === a.sel);
    return { q, list, exact, bill, sel: ok ? a.sel : null };
  }, [a.q, a.sel, merchants, bills]);
  const whereRef = useRef(where); whereRef.current = where;
  useEffect(() => { if (a.sel && !where.sel) setA((x) => ({ ...x, sel: null })); }, [a.sel, where.sel]);   // never keep a hidden selection

  // What this expense is for: a bill, the picked store, or the new store being added.
  const target = useMemo(() => {
    if (a.bill) return { name: a.bill.name, category: a.bill.category || "Utilities", isNew: false, isBill: true };
    if (where.sel === NEW_STORE) return { name: where.q, category: a.newCat, isNew: true, isBill: false };
    const m = where.sel ? merchants[where.sel] : undefined;
    return m ? { name: m.name, category: m.category || "", isNew: false, isBill: false } : null;
  }, [a.bill, a.newCat, where, merchants]);
  const targetRef = useRef(target); targetRef.current = target;
  // The category picker's "default": known once there's a store (and, for a new store, once its category is picked).
  const storeDefault: StoreDefault = target && !(target.isNew && !target.category) ? { store: target.name, category: target.category } : null;

  const close = () => closeSheet("#/");
  function showDup(e: Partial<Expense>, kind: "store" | "bill", name: string) {
    const by = e.createdBy || e.payer, who = by === people.me ? C.you : (by && people.names[by]) || C.someone;
    setA((x) => ({ ...x, checking: false, dup: dupLine(who, fmt(e.amountCents || 0), kind, name, shortDate(e.date || todayISO())) }));
  }
  async function findDup(): Promise<Hit | null> {
    const cur = aRef.current, t = targetRef.current;
    if (!t) return null;
    if (cur.bill) {
      const d = await billMonthDuplicate(cur.bill.id, cur.date, expenses);
      return d ? { d, kind: "bill", name: cur.bill.name } : null;
    }
    const d = storeDuplicate(expenses, merchants, t.name, toCents(cur.buf) || 0, cur.date);
    return d ? { d, kind: "store", name: canonicalName(merchants, t.name) } : null;
  }
  // True when it's safe to log. A result that arrives after a change, a step, or the sheet closing is ignored.
  async function checkDup(): Promise<boolean> {
    if (aRef.current.dupOk) return true;
    const my = ++seq.current, slow = !!aRef.current.bill;
    if (slow) setA((x) => ({ ...x, checking: true }));
    const hit = await findDup();
    if (my !== seq.current || closed.current) return false;
    if (hit) { showDup(hit.d, hit.kind, hit.name); return false; }
    if (slow) setA((x) => ({ ...x, checking: false }));
    return true;
  }
  // Review checks for a repeat when it opens, and again when the date changes there.
  const checkRef = useRef(checkDup); checkRef.current = checkDup;
  useEffect(() => { if (a.step === "review") void checkRef.current(); }, [a.step, a.date]);

  async function log() {
    const cur = aRef.current, t = targetRef.current;
    if (saving.current || cur.checking) return;
    if (cur.dup) { focusSoon("#dup-msg"); return; }   // answer the warning first
    if (!t) { set({ step: "where" }); return; }
    if (!toCents(cur.buf)) { set({ step: "amount", err: C.enterAmount, errField: "amount" }); return; }
    saving.current = true;
    if (!(await checkDup()) || closed.current) { saving.current = false; return; }
    const now = aRef.current, amountCents = toCents(now.buf) || 0;
    const e = addExpense({ amountCents, payer: now.payer, merchant: t.name, category: now.category || t.category || "Other", date: now.date || todayISO(),
      split: now.split, note: now.note.trim(), covers: now.covers.trim(), billId: now.bill?.id || null,
      ...(now.oneOff ? { oneOff: true } : {}) }, people.me);
    learnStore(merchants, t.name, e.category, t.isNew);
    const bill = now.bill, over = bill && bill.usualCents && amountCents > bill.usualCents * 1.2 ? fmt(bill.usualCents) : null;
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
  // Next: step 1 goes to review for a bill (or straight back to review once the store is known), else to the store step.
  function next() {
    const cur = aRef.current;
    if (cur.step === "amount") {
      if (!toCents(cur.buf)) { set({ err: C.enterAmount, errField: "amount" }); return; }
      if (cur.bill || (cur.seenReview && targetRef.current)) { set({ step: "review", seenReview: true, err: "", errField: null }); return; }
      set({ step: "where", err: "", errField: null });
      return;
    }
    if (cur.step === "where") {
      const w = whereRef.current;
      if (!w.sel) {
        set({ err: C.pickStore, errField: "store" });
        focusSoon(document.querySelector("#w-list input[name=store]") ? "#w-list input[name=store]" : "#w-q");
        return;
      }
      if (w.sel === NEW_STORE && !cur.newCat) { set({ err: pickCategoryFor(w.q), errField: "cat" }); focusSoon("#w-cat"); return; }
      set({ step: "review", seenReview: true, err: "", errField: null });
    }
  }
  function back() {
    const cur = aRef.current;
    if (cur.step === "review") set({ step: cur.bill ? "amount" : "where", err: "", errField: null });
    else if (cur.step === "where") set({ step: "amount", err: "", errField: null });
  }
  const jump = (step: Step) => set({ step, err: "", errField: null });
  const pickBill = (b: Bill) =>
    set({ bill: b, payer: b.payer || people.b, buf: centsToBuf(b.usualCents), covers: aRef.current.covers || monthName(), billsOpen: false, err: "", errField: null });
  const clearBill = () => { set({ bill: null, buf: "", payer: people.me, covers: "" }); focusSoon("[data-act=pick-bill]"); };
  const pickStore = (value: string | null) =>
    set({ sel: value, err: "", errField: null, ...(value === NEW_STORE ? { newCat: aRef.current.newCat || aRef.current.category } : {}) });
  const clearStore = () => { pickStore(null); focusSoon("#w-q"); };
  // Enter in the search box: first selects (the exact match, or "add new"), then goes Next.
  function enterInSearch() {
    const w = whereRef.current, cur = aRef.current;
    if (!w.q || (w.bill && !w.exact)) return;
    const want = w.exact ? w.exact.id : NEW_STORE;
    if (w.sel === want && (want !== NEW_STORE || cur.newCat)) return next();
    pickStore(want);
    if (want === NEW_STORE) focusSoon("#w-cat");
  }
  function addAnyway() {
    aRef.current = { ...aRef.current, dup: null, dupOk: true };
    setA((x) => ({ ...x, dup: null, dupOk: true }));
    void log();
  }
  function dontAdd() { setA((x) => ({ ...x, dup: null })); focusSoon("[data-act=log]"); }
  // The number pad also answers the keyboard on step 1 (not while the Bills drawer is open).
  const handlers = useRef({ key, next }); handlers.current = { key, next };
  useEffect(() => {
    if (a.step !== "amount" || a.billsOpen) return;
    const h = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || t.closest("input, select, textarea")) return;
      if (/^[0-9.]$/.test(ev.key)) { handlers.current.key(ev.key); ev.preventDefault(); }
      else if (ev.key === "Backspace") { handlers.current.key("back"); ev.preventDefault(); }
      else if (ev.key === "Enter" && !t.closest("button, a")) { handlers.current.next(); ev.preventDefault(); }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [a.step, a.billsOpen]);

  return { a, set, cents, where, target, storeDefault, people, bills, merchants, key, next, back, jump, log, pickBill, clearBill, pickStore,
    clearStore, enterInSearch, addAnyway, dontAdd, close,
    toBills: () => set({ step: "amount", billsOpen: true, err: "", errField: null }),
    openDetails: (field: DetailsField) => set({ details: { field } }), closeDetails: () => set({ details: null }) };
}
