import type { Expense, Person } from "@/data/types";
import { calc } from "./money";

type Money = Pick<Expense, "amountCents" | "payer" | "split" | "date">;
export type SettlementRecord = {
  date: string; createdAt: number; by: Person; from: Person | null; to: Person | null; amountCents: number;
  count: number; periodStart: string; periodEnd: string; [total: string]: string | number | null;
};
// Exactly what the current app's recordSettlement writes. Totals are keyed by member id ("p1Half", …). Positive net = a owes b.
export function settlementRecord(list: Money[], a: Person, b: Person, by: Person, today: string, now: number = Date.now()): SettlementRecord {
  const t = calc(list, a, b), dates = list.map((e) => e.date).sort();
  return {
    date: today, createdAt: now, by, from: t.net > 0 ? a : t.net < 0 ? b : null, to: t.net > 0 ? b : t.net < 0 ? a : null, amountCents: Math.abs(t.net),
    [`${a}Half`]: t.half[a], [`${b}Half`]: t.half[b], [`${a}Full`]: t.full[a], [`${b}Full`]: t.full[b],
    count: list.length, periodStart: dates[0], periodEnd: dates[dates.length - 1],
  };
}
// The other person's username, in both directions: you pay them, or you request from them.
export const venmoUrl = (user: string, txn: "pay" | "charge", cents: number, note: string) =>
  `https://venmo.com/${encodeURIComponent(user)}?txn=${txn}&amount=${(cents / 100).toFixed(2)}&note=${encodeURIComponent(note)}`;

export type VenmoPending = { net: number; count: number; at: number; txn: "pay" | "charge" };
// After Venmo the app can't see the payment, so it asks — but only while the note is recent and nothing unsettled has changed.
export function pendingValid(p: VenmoPending | null, list: Money[], a: Person, b: Person, now: number): boolean {
  return !!p && now - p.at <= 2 * 3600e3 && list.length > 0 && p.net === calc(list, a, b).net && p.count === list.length;
}
