import type { Expense, Person, Settings, Settlement } from "@/data/types";
import { C, daysBetween, fmt, fmtWhole, fullTo, halfDiff, halfPaid, iso, nudgeLine, pays, todayISO } from "./copy.js";

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
export type MathRow = { label: string; value: string; total?: boolean };
// A settle-up's math, from the totals stored on it (`${id}Half`, `${id}Full`), with member b listed first as before.
export function settleRows(s: Settlement, a: Person, b: Person, names: Record<Person, string>): MathRow[] {
  const n = (k: string) => Number(s[k] || 0);
  const ah = n(`${a}Half`), bh = n(`${b}Half`), af = n(`${a}Full`), bf = n(`${b}Full`), d = Math.round((bh - ah) / 2);
  const rows: MathRow[] = [
    { label: halfPaid(names[b]), value: fmt(bh) }, { label: halfPaid(names[a]), value: fmt(ah) },
    { label: C.halfDifference, value: halfDiff(fmt(Math.abs(d)), d >= 0 ? names[b] : names[a]) },
  ];
  if (bf) rows.push({ label: fullTo(names[b]), value: fmt(bf) });
  if (af) rows.push({ label: fullTo(names[a]), value: fmt(af) });
  rows.push({ label: s.amountCents && s.from && s.to ? pays(names[s.from], names[s.to]) : C.even, value: fmt(s.amountCents || 0), total: true });
  return rows;
}
// Activity entries by local day, keeping their order.
export function groupByDay<T extends { at: number }>(list: T[]): [string, T[]][] {
  const out: [string, T[]][] = [];
  for (const x of list) { const day = iso(new Date(x.at)), last = out[out.length - 1]; if (last && last[0] === day) last[1].push(x); else out.push([day, [x]]); }
  return out;
}
