import { describe, expect, it } from "vitest";
import { calc, groupByDate, nudgeText, sortExpenses } from "./money";
import type { Expense } from "@/data/types";

const e = (p: Partial<Expense>): Expense => ({ id: Math.random().toString(36), amountCents: 0, payer: "p1", merchant: "Costco",
  category: "Groceries", date: "2026-10-04", split: "half", settled: false, ...p });
describe("money", () => {
  it("nets halves and fulls (positive = a owes b)", () =>
    expect(calc([e({ amountCents: 120000, payer: "p2" }), e({ amountCents: 10000 }), e({ amountCents: 40000, split: "full" })], "p1", "p2").net).toBe(15000));
  it("matches the stored settlement fields", () => {
    const t = calc([e({ amountCents: 300, payer: "p2" }), e({ amountCents: 100, split: "full" })], "p1", "p2");
    expect([t.half.p2, t.full.p1, t.paid.p1, t.paid.p2]).toEqual([300, 100, 100, 300]);
  });
  it("rounds the odd half-cent once", () => expect(calc([e({ amountCents: 1, payer: "p2" })], "p1", "p2").net).toBe(1));
  it("sorts and groups", () => {
    const list = sortExpenses([e({ date: "2026-10-01", createdAt: 1 }), e({ date: "2026-10-04", createdAt: 2 }), e({ date: "2026-10-04", createdAt: 3 })]);
    expect(groupByDate(list).map(([d, xs]) => [d, xs.length])).toEqual([["2026-10-04", 2], ["2026-10-01", 1]]);
  });
  it("nudges by days and amount", () => {
    const list = [e({ amountCents: 120000, payer: "p2" }), e({ amountCents: 100, date: "2026-08-04" })];
    expect(nudgeText(list, [], {}, "p1", "p2", "2026-10-04")).toBe("It’s been 61 days and the balance is over $500.");
    expect(nudgeText(list, [], { nudgeDays: 0, nudgeCents: 0 }, "p1", "p2", "2026-10-04")).toBeNull();
  });
});
