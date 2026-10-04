import { collection, doc, increment, setDoc, writeBatch, type WriteBatch } from "firebase/firestore";
import { toast } from "sonner";
import { C } from "@/domain/copy.js";
import { summaryOf, type Change } from "@/domain/expenses";
import { canonicalSlug, slug } from "@/domain/stores.js";
import { db } from "./firebase";
import type { Expense, Merchant, Person } from "./types";

export type ExpenseFields = Pick<Expense, "amountCents" | "payer" | "merchant" | "category" | "date" | "split"> & { note: string; covers: string };
export type NewExpense = ExpenseFields & { billId: string | null };

export function writeFailed(e: unknown) {
  console.error(e);
  toast.error((e as { code?: string })?.code === "permission-denied" ? C.cantChange : C.cantSave);
}
// One entry per add, edit, delete, or settle-up, written in the same batch as the change.
type Entry = { action: string; expenseId?: string | null; settlementId?: string | null; summary?: unknown; changes?: Change[] };
function logEntry(b: WriteBatch, by: Person, entry: Entry, id?: string) {
  const ref = id ? doc(db, "activity", id) : doc(collection(db, "activity"));
  b.set(ref, { at: Date.now(), by, expenseId: null, settlementId: null, summary: null, changes: [], ...entry });
}
// Not awaited on purpose: Firestore applies it locally right away and syncs when it can.
export function addExpense(input: NewExpense, by: Person): Expense {
  const ref = doc(collection(db, "expenses")), now = Date.now();
  const data = { ...input, merchant: input.merchant.slice(0, 80), note: input.note.slice(0, 140), covers: input.covers.slice(0, 60),
    settled: false, settlementId: null, createdAt: now, createdBy: by, updatedAt: now, updatedBy: by };
  const b = writeBatch(db);
  b.set(ref, data);
  logEntry(b, by, { action: "add", expenseId: ref.id, summary: summaryOf(data) }, `add-${ref.id}`);
  b.commit().catch(writeFailed);
  return { id: ref.id, ...data } as Expense;
}
// Undo removes the expense and its add entry together, so a corrected mistake leaves no trace.
export function undoAdd(id: string) {
  const b = writeBatch(db);
  b.delete(doc(db, "expenses", id)); b.delete(doc(db, "activity", `add-${id}`));
  b.commit().catch(writeFailed);
}
// Count a store's use. Typed as a new store: bring a removed name back, and detach it from a removed store it pointed to.
export function learnStore(merchants: Record<string, Merchant>, name: string, category: string, unhide: boolean) {
  const id = slug(name), patch: Record<string, unknown> = { name, category, count: increment(1), lastUsed: Date.now() };
  if (unhide) {
    patch.hidden = false;
    const end = merchants[canonicalSlug(merchants, id)];
    if (merchants[id]?.mergedInto && (!end || end.hidden)) patch.mergedInto = null;
  }
  setDoc(doc(db, "merchants", id), patch, { merge: true }).catch(() => {});
}
