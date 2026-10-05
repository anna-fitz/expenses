import { describe, expect, it } from "vitest";
import type { Expense } from "@/data/types";
import { EMPTY, bucketOf, daysIn, figuresFor, figuresFromExpenses, figuresFromHistory, median, pace, pctOf, shiftMonth, usual, usualMix, type HistoryDoc } from "./insights";

const e = (o: Partial<Expense>): Expense => ({ id: "x", amountCents: 0, payer: "p1", merchant: "Costco", category: "Groceries", date: "2026-08-05", split: "half", settled: false, ...o });
const H: HistoryDoc = { through: "2026-07", months: {
  "2026-06": { cats: { Groceries: 60000, "Dining & takeout": 40000 }, bills: { electricity: 64555 }, oneOffs: {}, oneOffCount: 0 },
  "2026-07": { cats: { Groceries: 51000, "Dining & takeout": 30000 }, bills: { electricity: 64555 }, oneOffs: { "Home & household": 290000 }, oneOffCount: 1 } } };

describe("buckets", () => {
  it("defaults by category, and a saved map wins", () => {
    expect([bucketOf("Utilities"), bucketOf("Groceries"), bucketOf("Coffee"), bucketOf("Something new")]).toEqual(["need", "need", "want", "want"]);
    expect(bucketOf("Coffee", { Coffee: "need" })).toBe("need");
  });
});
describe("a month's figures", () => {
  it("splits app expenses into everyday, bills, and one-offs", () => {
    const f = figuresFromExpenses([e({ amountCents: 40000 }), e({ amountCents: 20000, category: "Dining & takeout" }),
      e({ amountCents: 64555, category: "Utilities", billId: "electricity" }), e({ amountCents: 150849, category: "Home & household", oneOff: true })], {});
    expect(f).toMatchObject({ everyday: 60000, bills: 64555, billsBy: { electricity: 64555 }, oneOffs: 150849, oneOffCount: 1, total: 275404,
      byCategory: { Groceries: 40000, "Dining & takeout": 20000 }, buckets: { bill: 64555, need: 190849, want: 20000 } });
  });
  it("reads a summary month the same way", () =>
    expect(figuresFromHistory(H.months["2026-07"], {})).toMatchObject({ everyday: 81000, bills: 64555, oneOffs: 290000, oneOffCount: 1,
      buckets: { bill: 64555, need: 51000 + 290000, want: 30000 } }));
  it("uses the summary through its last month, and the app after — never both", () => {
    const app = [e({ amountCents: 999, date: "2026-07-31" }), e({ amountCents: 500, date: "2026-08-02" })];
    expect(figuresFor("2026-07", app, H, {})?.everyday).toBe(81000);
    expect(figuresFor("2026-08", app, H, {})?.everyday).toBe(500);
    expect(figuresFor("2026-05", app, H, {})).toBeNull();
    expect(figuresFor("2026-09", app, H, {})).toBeNull();
  });
});
describe("usual, pace, and mix", () => {
  const months: Record<string, number> = { "2026-02": 90000, "2026-03": 100000, "2026-04": 90000, "2026-05": 80000, "2026-06": 100000, "2026-07": 81000 };
  const get = (m: string) => (m in months ? { ...EMPTY, everyday: months[m], total: months[m], buckets: { bill: 0, need: months[m] / 2, want: months[m] / 2 } } : null);
  it("is the median of the six months before", () => expect(usual("2026-08", get, (f) => f.everyday)).toBe(90000));
  it("needs at least three months", () => expect(usual("2026-03", get, (f) => f.everyday)).toBeNull());
  it("medians", () => expect([median([3, 1, 2]), median([1, 2, 3, 5])]).toEqual([2, 3]));
  it("judges pace with 15% bands, after the first five days", () => {
    expect(pace(60000, 90000, 20, 31)).toEqual({ status: "on", byNow: 58065 });
    expect(pace(70000, 90000, 20, 31).status).toBe("high");
    expect(pace(40000, 90000, 20, 31).status).toBe("low");
    expect(pace(90000, 90000, 3, 31).status).toBe("early");
  });
  it("averages the mix over the same months", () => expect(usualMix("2026-08", get)).toEqual({ bill: 0, need: 50, want: 50 }));
  it("does month arithmetic", () => {
    expect([shiftMonth("2026-01", -1), shiftMonth("2026-12", 1), shiftMonth("2026-08", -13)]).toEqual(["2025-12", "2027-01", "2025-07"]);
    expect([daysIn("2026-02"), daysIn("2026-08"), pctOf(1, 3), pctOf(1, 0)]).toEqual([28, 31, 33, 0]);
  });
});
