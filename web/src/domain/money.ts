import type { Expense, Person, Settings, Settlement } from "@/data/types";
import { daysBetween, fmtWhole, nudgeLine, todayISO } from "./copy.js";

export type Totals = { half: Record<Person, number>; full: Record<Person, number>; paid: Record<Person, number>; net: number; diffHalf: number };
type Money = Pick<Expense, "amountCents" | "payer" | "split">;

// Positive net = member a owes member b. Summed in half-cents so odd cents never drift.
export function calc(list: Money[], a: Person, b: Person): Totals {
  const half: Record<Person, number> = { [a]: 0, [b]: 0 }, full: Record<Person, number> = { [a]: 0, [b]: 0 };
  for (const e of list) { const bucket = e.split === "full" ? full : half; bucket[e.payer] = (bucket[e.payer] || 0) + (e.amountCents | 0); }
  const h = (half[b] - half[a]) + 2 * (full[b] - full[a]);
  return {
    half, full, paid: { [a]: half[a] + full[a], [b]: half[b] + full[b] },
    net: Math.sign(h) * Math.round(Math.abs(h) / 2),
    diffHalf: Math.sign(half[b] - half[a]) * Math.round(Math.abs(half[b] - half[a]) / 2),
  };
}
export const DEFAULT_SETTINGS: Settings = { nudgeDays: 60, nudgeCents: 50000 };
export function nudgeText(expenses: Expense[], settlements: Settlement[], settings: Partial<Settings>, a: Person, b: Person, today: string = todayISO()): string | null {
  if (!expenses.length) return null;
  const s = { ...DEFAULT_SETTINGS, ...settings }, last = settlements[0];
  const days = daysBetween(last ? last.date : expenses.map((e) => e.date).sort()[0], today), over = Math.abs(calc(expenses, a, b).net);
  const byDays = s.nudgeDays > 0 && days >= s.nudgeDays, byAmt = s.nudgeCents > 0 && over > s.nudgeCents;
  return byDays || byAmt ? nudgeLine(byDays ? days : null, byAmt ? fmtWhole(s.nudgeCents) : null, !!last) : null;
}
export const sortExpenses = (list: Expense[]) =>
  list.slice().sort((x, y) => (y.date || "").localeCompare(x.date || "") || (y.createdAt || 0) - (x.createdAt || 0));
export function groupByDate(sorted: Expense[]): [string, Expense[]][] {
  const out: [string, Expense[]][] = [];
  for (const e of sorted) { const last = out[out.length - 1]; if (last && last[0] === e.date) last[1].push(e); else out.push([e.date, [e]]); }
  return out;
}
