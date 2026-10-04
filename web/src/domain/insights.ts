import type { Expense, Merchant } from "@/data/types";
import { daysBetween } from "./copy.js";
import { canonicalName } from "./stores.js";

export type PeriodStats = {
  days: number; since: "settle" | "first"; total: number;
  top: { name: string; count: number; cents: number }; big: { amountCents: number; merchant: string };
};
// "This period", the same math as the current app's periodStats: local arithmetic only, store names through aliases.
export function periodStats(list: Expense[], settlements: { date: string }[], merchants: Record<string, Merchant>, today: string): PeriodStats | null {
  if (!list.length) return null;
  const last = settlements[0], start = last ? last.date : list.map((e) => e.date).sort()[0];
  const by: Record<string, { name: string; count: number; cents: number }> = {};
  for (const e of list) {
    const n = canonicalName(merchants, e.merchant), m = (by[n] ||= { name: n, count: 0, cents: 0 });
    m.count++; m.cents += e.amountCents | 0;
  }
  const big = list.slice().sort((x, y) => y.amountCents - x.amountCents)[0];
  return {
    days: daysBetween(start, today), since: last ? "settle" : "first", total: list.reduce((s, e) => s + (e.amountCents | 0), 0),
    top: Object.values(by).sort((x, y) => y.count - x.count || y.cents - x.cents)[0],
    big: { amountCents: big.amountCents, merchant: canonicalName(merchants, big.merchant) },
  };
}
