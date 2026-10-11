import { doc, increment, writeBatch, type WriteBatch } from "firebase/firestore";
import type { BillFields } from "@/domain/lists";
import { billChanges, newBillId } from "@/domain/lists";
import { db } from "./firebase";
import type { Bill, Merchant, Person } from "./types";
import { logEntry, writeFailed, type Entry } from "./writes";

const mref = (id: string) => doc(db, "merchants", id);
// Each change and its Activity entry go in one batch, exactly as the current app writes them.
function batch(by: Person, fn: (b: WriteBatch) => void, entry: Entry) {
  const b = writeBatch(db); fn(b); logEntry(b, by, entry); b.commit().catch(writeFailed);
}

/* ---------- Stores ---------- */
type Plan = { kind: "same"; name: string } | { kind: "move"; newId: string; name: string };
// Everything planRename (stores.js) can answer; it is plain JS, so its result is typed here.
export type RenamePlan = { kind: "empty" } | { kind: "conflict"; targetId: string; targetName: string } | Plan;
// Returns the id the store lives under afterwards. A new name keeps the old record as an alias, so past expenses follow.
export function renameStore(merchants: Record<string, Merchant>, id: string, plan: Plan, by: Person): string {
  const m = merchants[id], summary = { name: m.name, to: plan.name };
  if (plan.kind === "same") { batch(by, (b) => b.set(mref(id), { name: plan.name }, { merge: true }), { action: "store", kind: "rename", summary }); return id; }
  const fresh = { name: plan.name, category: m.category || "Other", count: m.count || 0, hidden: false, mergedInto: null };
  batch(by, (b) => { b.set(mref(plan.newId), fresh, { merge: true }); b.set(mref(id), { hidden: true, mergedInto: plan.newId }, { merge: true }); },
    { action: "store", kind: "rename", summary });
  return plan.newId;
}
export function mergeStore(merchants: Record<string, Merchant>, id: string, targetId: string, by: Person) {
  const m = merchants[id], t = merchants[targetId];
  batch(by, (b) => { b.set(mref(id), { hidden: true, mergedInto: targetId }, { merge: true }); b.set(mref(targetId), { count: increment(m.count || 0) }, { merge: true }); },
    { action: "store", kind: "merge", summary: { name: m.name, to: t.name } });
}
export function setStoreCategory(merchants: Record<string, Merchant>, id: string, cat: string, by: Person): boolean {
  const m = merchants[id];
  if (!m || m.category === cat) return false;
  batch(by, (b) => b.set(mref(id), { category: cat }, { merge: true }),
    { action: "store", kind: "category", summary: { name: m.name }, changes: [{ field: "category", from: m.category || "", to: cat }] });
  return true;
}
export function removeStore(merchants: Record<string, Merchant>, id: string, by: Person) {
  batch(by, (b) => b.set(mref(id), { hidden: true }, { merge: true }), { action: "store", kind: "remove", summary: { name: merchants[id].name } });
}
export function restoreStore(merchants: Record<string, Merchant>, id: string, by: Person) {
  batch(by, (b) => b.set(mref(id), { hidden: false }, { merge: true }), { action: "store", kind: "restore", summary: { name: merchants[id].name } });
}

/* ---------- Bills ---------- */
export function addBill(bills: Bill[], data: BillFields, by: Person): string {
  const id = newBillId(data.name, bills), order = Math.max(0, ...bills.map((x) => x.order || 0)) + 1;
  batch(by, (b) => b.set(doc(db, "bills", id), { order, active: true, ...data }),
    { action: "bill", kind: "add", summary: { name: data.name, amountCents: data.usualCents } });
  return id;
}
// Logs only what changed. Returns false, writing nothing, when nothing did.
export function editBill(orig: Bill, data: BillFields, by: Person): boolean {
  const changes = billChanges(orig, data);
  if (!changes.length) return false;
  batch(by, (b) => b.update(doc(db, "bills", orig.id), data), { action: "bill", kind: "edit", summary: { name: orig.name }, changes });
  return true;
}
export function setBillActive(bill: Bill, active: boolean, by: Person) {
  batch(by, (b) => b.update(doc(db, "bills", bill.id), { active }), { action: "bill", kind: active ? "restore" : "retire", summary: { name: bill.name } });
}
