import { describe, expect, it } from "vitest";
import type { Settlement } from "@/data/types";
import { groupByDay, settleRows } from "./money";

const N = { p1: "Alex", p2: "Sam" };
describe("a settle-up's math", () => {
  it("lays it out from the stored totals", () => {
    const s = { id: "s1", date: "2026-09-30", createdAt: 1, from: "p1", to: "p2", amountCents: 37744, count: 2,
      p1Half: 4512, p2Half: 0, p1Full: 0, p2Full: 40000 } as Settlement;
    expect(settleRows(s, "p1", "p2", N)).toEqual([
      { label: "Sam paid, split 50/50", value: "$0.00" }, { label: "Alex paid, split 50/50", value: "$45.12" },
      { label: "Half the difference", value: "$22.56 to Alex" }, { label: "Owed in full to Sam", value: "$400.00" },
      { label: "Alex pays Sam", value: "$377.44", total: true }]);
  });
  it("closes an even period", () => {
    const s = { id: "s0", date: "2026-08-31", createdAt: 1, from: null, to: null, amountCents: 0, count: 1, p1Half: 500, p2Half: 500 } as Settlement;
    expect(settleRows(s, "p1", "p2", N).at(-1)).toEqual({ label: "You’re even", value: "$0.00", total: true });
  });
});
describe("activity days", () => {
  it("groups by local day, keeping order", () => {
    const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime();
    const list = [{ id: "c", at: at(3, 18) }, { id: "b", at: at(3, 9) }, { id: "a", at: at(2, 23) }];
    expect(groupByDay(list).map(([day, l]) => [day, l.map((x) => x.id)])).toEqual([["2026-10-03", ["c", "b"]], ["2026-10-02", ["a"]]]);
  });
});
