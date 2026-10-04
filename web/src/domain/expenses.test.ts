import { describe, expect, it } from "vitest";
import type { Expense, Merchant } from "@/data/types";
import { editChanges, sameMonth, storeDuplicate, summaryOf } from "./expenses";

const M: Record<string, Merchant> = {
  costco: { name: "Costco", category: "Groceries" }, "costco-old": { name: "Costco Old", hidden: true, mergedInto: "costco" }, target: { name: "Target" },
};
const ex = (o: Partial<Expense>): Expense => ({ id: "x", amountCents: 4512, payer: "p1", merchant: "Costco", category: "Groceries",
  date: "2026-10-03", split: "half", settled: false, createdAt: 1, ...o });

describe("duplicates", () => {
  const list = [ex({ id: "a", createdAt: 1 }), ex({ id: "b", merchant: "Costco Old", createdAt: 2 }), ex({ id: "c", amountCents: 4513, createdAt: 3 })];
  it("same store (through aliases) and amount within 3 days, newest first", () => {
    expect(storeDuplicate(list, M, "Costco", 4512, "2026-10-06")?.id).toBe("b");
    expect(storeDuplicate(list, M, "costco", 4512, "2026-09-30")?.id).toBe("b");
  });
  it("not 4 days apart, not another store", () => {
    expect(storeDuplicate(list, M, "Costco", 4512, "2026-10-07")).toBeNull();
    expect(storeDuplicate(list, M, "Target", 4512, "2026-10-03")).toBeNull();
  });
  it("a bill in the same month, newest first", () => {
    const bills = [{ date: "2026-10-01", createdAt: 1 }, { date: "2026-09-30", createdAt: 5 }, { date: "2026-10-20", createdAt: 3 }];
    expect(sameMonth(bills, "2026-10-15")).toEqual({ date: "2026-10-20", createdAt: 3 });
    expect(sameMonth(bills, "2026-11-01")).toBeNull();
  });
});
describe("edits", () => {
  const orig = ex({ id: "e1", merchant: "Costco Old" });
  const same = { amountCents: 4512, payer: "p1", merchant: "Costco", category: "Groceries", date: "2026-10-03", split: "half", note: "", covers: "" };
  it("an unchanged expense under its current store name has no changes", () => expect(editChanges(orig, same, M)).toEqual([]));
  it("lists changed fields in a fixed order", () =>
    expect(editChanges(orig, { ...same, merchant: "Target", amountCents: 2500 }, M)).toEqual([
      { field: "amountCents", from: 4512, to: 2500 }, { field: "merchant", from: "Costco", to: "Target" }]));
  it("summarizes for the log", () => expect(summaryOf(orig)).toEqual({ amountCents: 4512, merchant: "Costco Old", payer: "p1" }));
});
