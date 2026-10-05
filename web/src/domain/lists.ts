import type { Bill, Merchant, Person } from "@/data/types";
import { C, billExists, storeTaken } from "./copy.js";
import type { Change } from "./expenses";
import { slug } from "./stores.js";

export type BillFields = { name: string; usualCents: number; category: string; payer: Person };
const BILL_FIELDS = ["name", "usualCents", "category", "payer"] as const;

// The first problem with a bill name, worded for the field, or null. Bills and stores never share a name.
// A bill's own store record (written when it's logged) is not "a store", so a bill can keep its own name.
export function billNameError(name: string, bills: Bill[], merchants: Record<string, Merchant>, editingId?: string): string | null {
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) return C.enterName;
  const twin = bills.find((b) => b.id !== editingId && b.name.toLowerCase() === n.toLowerCase());
  if (twin) return billExists(twin.name);
  const key = slug(n), m = merchants[key], billKeys = new Set(bills.map((b) => slug(b.name)));
  if (m && m.name && !m.hidden && !m.mergedInto && !billKeys.has(key)) return storeTaken(m.name);
  return null;
}
// Same as the current app: the slug of the name, then "-2", "-3"… until unused.
export function newBillId(name: string, bills: Bill[]): string {
  const base = slug(name), taken = new Set(bills.map((b) => b.id));
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}
export function billChanges(orig: Bill, next: BillFields): Change[] {
  return BILL_FIELDS.filter((f) => (orig[f] ?? "") !== next[f]).map((f) => ({ field: f, from: orig[f] ?? "", to: next[f] }));
}
