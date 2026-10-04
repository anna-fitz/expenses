import type { Expense, Merchant, Person } from "@/data/types";
import { daysBetween } from "./copy.js";
import { canonicalName, canonicalSlug } from "./stores.js";

export const NEW_STORE = "__new__";
export const EDIT_FIELDS = ["amountCents", "payer", "merchant", "category", "date", "split", "note", "covers"] as const;
export type Change = { field: string; from: unknown; to: unknown };
export type Summary = { amountCents: number; merchant: string; payer: Person };
export const summaryOf = (e: Pick<Expense, "amountCents" | "merchant" | "payer">): Summary => ({ amountCents: e.amountCents, merchant: e.merchant, payer: e.payer });

const gap = (x: string, y: string) => (x <= y ? daysBetween(x, y) : daysBetween(y, x));
const newest = (x: { createdAt?: number }, y: { createdAt?: number }) => (y.createdAt || 0) - (x.createdAt || 0);

// Same store (aliases count as the same) and amount, within 3 days either way. Newest first.
export function storeDuplicate(list: Expense[], merchants: Record<string, Merchant>, name: string, cents: number, date: string): Expense | null {
  const key = canonicalSlug(merchants, name);
  return list.filter((e) => e.amountCents === cents && canonicalSlug(merchants, e.merchant) === key && gap(e.date, date) <= 3).sort(newest)[0] || null;
}
// The same bill already logged this calendar month (settled ones included by the caller's query).
export function sameMonth<T extends { date?: string; createdAt?: number }>(list: T[], date: string): T | null {
  return list.filter((x) => (x.date || "").slice(0, 7) === date.slice(0, 7)).sort(newest)[0] || null;
}
// What an edit changed, compared against the store's current name. Empty and missing count as the same.
export function editChanges(orig: Expense, next: Record<string, unknown>, merchants: Record<string, Merchant>): Change[] {
  const base: Record<string, unknown> = { ...orig, merchant: canonicalName(merchants, orig.merchant) };
  return EDIT_FIELDS.filter((f) => (base[f] ?? "") !== (next[f] ?? "")).map((f) => ({ field: f, from: base[f] ?? "", to: next[f] ?? "" }));
}
