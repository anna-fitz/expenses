import type { Expense } from "@/data/types";
import { todayISO } from "./copy.js";

// The three groups on Insights. "bill" is never mapped: it is exactly the expenses logged as bills.
export type Bucket = "bill" | "need" | "want";
export type Mapped = "need" | "want";
export const BUCKETS: Bucket[] = ["bill", "need", "want"];
export const DEFAULT_BUCKETS: Record<string, Mapped> = {
  Utilities: "need", "Pool & yard": "need", Groceries: "need", "Home & household": "need", Pets: "need", "Car & fuel": "need",
  "Dining & takeout": "want", Coffee: "want", "Drinks & smoke shop": "want", "Travel & fun": "want", "Gifts & occasions": "want", Other: "want",
};
export const bucketOf = (category: string, map: Partial<Record<string, Mapped>> = {}): Mapped => map[category] || DEFAULT_BUCKETS[category] || "want";

// The pre-app monthly summary (config/history): totals only — no stores, notes, dates or payers.
export type HistoryMonth = { cats: Record<string, number>; bills: Record<string, number>; oneOffs?: Record<string, number>; oneOffCount?: number };
export type HistoryDoc = { through: string; months: Record<string, HistoryMonth> };
export type Figures = {
  everyday: number; bills: number; billsBy: Record<string, number>; byCategory: Record<string, number>;
  oneOffs: number; oneOffCount: number; buckets: Record<Bucket, number>; total: number;
};
export const EMPTY: Figures = { everyday: 0, bills: 0, billsBy: {}, byCategory: {}, oneOffs: 0, oneOffCount: 0, buckets: { bill: 0, need: 0, want: 0 }, total: 0 };

const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);
const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] || 0) + v; };
// Bills are their own group whatever their category; everything else (one-offs too) goes to its category's Need or Want. One-offs go to their category's bucket.
function finish(byCategory: Record<string, number>, billsBy: Record<string, number>, oneOffBy: Record<string, number>, oneOffCount: number,
  map: Partial<Record<string, Mapped>>): Figures {
  const everyday = sum(byCategory), bills = sum(billsBy), oneOffs = sum(oneOffBy), buckets = { bill: bills, need: 0, want: 0 };
  for (const [c, v] of Object.entries(byCategory)) buckets[bucketOf(c, map)] += v;
  for (const [c, v] of Object.entries(oneOffBy)) buckets[bucketOf(c, map)] += v;
  return { everyday, bills, billsBy, byCategory, oneOffs, oneOffCount, buckets, total: everyday + bills + oneOffs };
}
export function figuresFromExpenses(list: Expense[], map: Partial<Record<string, Mapped>>): Figures {
  const byCategory: Record<string, number> = {}, billsBy: Record<string, number> = {}, oneOffBy: Record<string, number> = {};
  let n = 0;
  for (const x of list) {
    const v = x.amountCents | 0;
    if (x.billId) add(billsBy, x.billId, v);
    else if (x.oneOff) { add(oneOffBy, x.category || "Other", v); n++; }
    else add(byCategory, x.category || "Other", v);
  }
  return finish(byCategory, billsBy, oneOffBy, n, map);
}
export const figuresFromHistory = (h: HistoryMonth, map: Partial<Record<string, Mapped>>) =>
  finish({ ...h.cats }, { ...h.bills }, { ...(h.oneOffs || {}) }, h.oneOffCount || 0, map);

export const monthOf = (iso: string) => iso.slice(0, 7);
export function shiftMonth(m: string, n: number): string {
  const [y, mo] = m.split("-").map(Number), d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export const daysIn = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
// Tests pin "today" with window.__today so results never depend on the real date.
export const today = (): string => (globalThis as { __today?: string }).__today || todayISO();

// A month on or before the summary's last month comes only from the summary; later months only from the app. Never both.
export function figuresFor(m: string, app: Expense[], history: HistoryDoc | null, map: Partial<Record<string, Mapped>>): Figures | null {
  if (history && m <= history.through) { const h = history.months[m]; return h ? figuresFromHistory(h, map) : null; }
  const list = app.filter((x) => monthOf(x.date) === m);
  return list.length ? figuresFromExpenses(list, map) : null;
}
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2);
}
const previous = (m: string, get: (k: string) => Figures | null) =>
  [1, 2, 3, 4, 5, 6].map((i) => get(shiftMonth(m, -i))).filter((f): f is Figures => !!f);
// The middle value of the six months before m that have data; at least three are needed.
export function usual(m: string, get: (k: string) => Figures | null, pick: (f: Figures) => number): number | null {
  const vals = previous(m, get).map(pick);
  return vals.length >= 3 ? median(vals) : null;
}
export function usualMix(m: string, get: (k: string) => Figures | null): Record<Bucket, number> | null {
  const fs = previous(m, get).filter((f) => f.total > 0);
  if (fs.length < 3) return null;
  const avg = (b: Bucket) => Math.round((fs.reduce((s, f) => s + f.buckets[b] / f.total, 0) / fs.length) * 100);
  return { bill: avg("bill"), need: avg("need"), want: avg("want") };
}
export type PaceStatus = "early" | "on" | "high" | "low";
export function pace(spent: number, usualMonth: number, day: number, days: number): { status: PaceStatus; byNow: number } {
  const byNow = Math.round((usualMonth * day) / days);
  if (day <= 5) return { status: "early", byNow };
  if (spent > byNow * 1.15) return { status: "high", byNow };
  if (spent < byNow * 0.85) return { status: "low", byNow };
  return { status: "on", byNow };
}
export const pctOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
