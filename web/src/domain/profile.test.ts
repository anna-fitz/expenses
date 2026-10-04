import { describe, expect, it } from "vitest";
import type { Expense, Merchant } from "@/data/types";
import { periodStats } from "./insights";
import { isOneEmoji, normalizeVenmo } from "./profile";

describe("one emoji", () => {
  it("accepts any single emoji, however many code points it takes", () =>
    expect(["🐶", "👍🏾", "👩🏽‍💻", "🏳️‍🌈", "❤️", " 🦊 "].map(isOneEmoji)).toEqual([true, true, true, true, true, true]));
  it("refuses text, two emoji, and nothing", () =>
    expect(["a", "🐶🐱", "", " ", ":)", "1"].map(isOneEmoji)).toEqual([false, false, false, false, false, false]));
});
describe("Venmo username", () => {
  it("strips one leading @ and checks 5–30 letters, numbers, dashes, underscores", () => {
    expect(normalizeVenmo(" @alex_pays ")).toEqual({ value: "alex_pays", ok: true });
    expect(normalizeVenmo("ab")).toEqual({ value: "ab", ok: false });
    expect(normalizeVenmo("has space")).toEqual({ value: "has space", ok: false });
    expect(normalizeVenmo("")).toEqual({ value: "", ok: true });   // empty removes it
  });
});
describe("this period", () => {
  const M: Record<string, Merchant> = { costco: { name: "Costco" }, "costco-old": { name: "Costco Old", hidden: true, mergedInto: "costco" }, target: { name: "Target" } };
  const e = (merchant: string, amountCents: number, date: string) => ({ id: merchant + amountCents, merchant, amountCents, date, payer: "p1", split: "half", category: "x", settled: false }) as Expense;
  const list = [e("Costco", 4512, "2026-10-01"), e("Costco Old", 1000, "2026-10-02"), e("Target", 40000, "2026-10-03")];
  it("counts from the first expense when you've never settled", () =>
    expect(periodStats(list, [], M, "2026-10-04")).toEqual({ days: 3, since: "first", total: 45512,
      top: { name: "Costco", count: 2, cents: 5512 }, big: { amountCents: 40000, merchant: "Target" } }));
  it("counts from the last settle-up", () => expect(periodStats(list, [{ date: "2026-09-29" }], M, "2026-10-04")).toMatchObject({ days: 5, since: "settle" }));
  it("breaks a tie on count by money", () =>
    expect(periodStats([e("Target", 100, "2026-10-01"), e("Costco", 200, "2026-10-01")], [], M, "2026-10-04")?.top.name).toBe("Costco"));
  it("has nothing to say with nothing unsettled", () => expect(periodStats([], [], M, "2026-10-04")).toBeNull());
});
