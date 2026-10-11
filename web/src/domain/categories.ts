import { C, categoryDefault } from "./copy.js";

export const CATEGORIES: string[] = ["Groceries", "Home & household", "Utilities", "Pool & yard", "Pets", "Dining & takeout", "Coffee",
  "Drinks & smoke shop", "Car & fuel", "Travel & fun", "Gifts & occasions", "Other"];
// A–Z, with the catch-all "Other" last. Every category picker uses this order.
export const SORTED_CATEGORIES: string[] = [...CATEGORIES.filter((c) => c !== "Other").sort((x, y) => x.localeCompare(y, "en")), "Other"];

export type StoreDefault = { store: string; category: string } | null;
export type CatOption = { value: string; label: string };
// The picker's options. Once a store is known, its usual category is marked in place ("Groceries (default for Costco)");
// before then, a first "Store's default" option stands in for it. `extra` keeps an older category that's no longer listed.
export function categoryOptions(def: StoreDefault, extra?: string): CatOption[] {
  const list = extra && !SORTED_CATEGORIES.includes(extra) ? [...SORTED_CATEGORIES, extra] : SORTED_CATEGORIES;
  const opts = list.map((c) => ({ value: c, label: def && def.category === c ? categoryDefault(c, def.store) : c }));
  return def ? opts : [{ value: "", label: C.storeDefault }, ...opts];
}
// What the picker shows: the explicit choice, else the store's default. An older store without one falls back to Other, as when saving.
export const categoryValue = (chosen: string, def: StoreDefault) => chosen || (def ? def.category || "Other" : "");
// Picking the store's default is the same as leaving it on the default ("").
export const categoryChoice = (v: string, def: StoreDefault) => (def && v === (def.category || "Other") ? "" : v);
