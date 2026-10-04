import type { Bill } from "@/data/types";
import { slug } from "./stores.js";

// Bills are their own flow (Pick a bill on step 1), so their names never appear as stores. Retired bills count too.
const billSlugs = (bills: Pick<Bill, "name">[]) => new Set(bills.map((b) => slug(b.name)));
export function withoutBills<T extends { id: string; name: string }>(list: T[], bills: Pick<Bill, "name">[]): T[] {
  const s = billSlugs(bills);
  return list.filter((m) => !s.has(m.id) && !s.has(slug(m.name)));
}
// The bill a typed store name refers to, if any.
export function billNamed<T extends Pick<Bill, "name">>(bills: T[], q: string): T | null {
  const key = slug(q.trim().replace(/\s+/g, " "));
  return q.trim() ? bills.find((b) => slug(b.name) === key) || null : null;
}
