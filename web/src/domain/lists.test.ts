import { describe, expect, it } from "vitest";
import type { Bill, Merchant } from "@/data/types";
import { billChanges, billNameError, newBillId } from "./lists";

const BILLS = [
  { id: "water", name: "Water", usualCents: 28000, category: "Utilities", payer: "p2", order: 1, active: true },
  { id: "gas-bill", name: "Gas bill", usualCents: 1700, category: "Utilities", payer: "p2", order: 2, active: false },
] as Bill[];
// Every bill also has a store record under its own name (logging a bill counts it as a store); those aren't stores here.
const M: Record<string, Merchant> = { costco: { name: "Costco" }, water: { name: "Water" }, gone: { name: "Gone", hidden: true }, tjs: { name: "TJs", hidden: true, mergedInto: "costco" } };

describe("bill names", () => {
  it("needs a name", () => expect(billNameError("  ", BILLS, M)).toBe("Enter a name"));
  it("can't repeat another bill, ignoring case, retired ones included", () => {
    expect(billNameError("water", BILLS, M)).toBe("There’s already a bill called Water");
    expect(billNameError("GAS BILL", BILLS, M)).toBe("There’s already a bill called Gas bill");
  });
  it("can't take a store's name", () =>
    expect(billNameError("costco", BILLS, M)).toBe("There’s already a store called Costco. Give the bill a different name."));
  it("ignores removed stores and old names", () => {
    expect(billNameError("Gone", BILLS, M)).toBeNull();
    expect(billNameError("TJs", BILLS, M)).toBeNull();
  });
  it("editing a bill to its own name is fine, even its own store record", () => {
    expect(billNameError("Water", BILLS, M, "water")).toBeNull();
    expect(billNameError("WATER", BILLS, M, "water")).toBeNull();
  });
  it("a brand-new name is fine", () => expect(billNameError("Trash", BILLS, M)).toBeNull());
});
describe("bill ids and changes", () => {
  it("makes an id from the name, numbered when taken", () => {
    expect(newBillId("Trash", BILLS)).toBe("trash");
    expect(newBillId("Water!", BILLS)).toBe("water-2");
    expect(newBillId("Water", [...BILLS, { ...BILLS[0], id: "water-2" }])).toBe("water-3");
  });
  it("lists only what changed, in a fixed order", () => {
    expect(billChanges(BILLS[0], { name: "Water", usualCents: 30000, category: "Utilities", payer: "p1" })).toEqual([
      { field: "usualCents", from: 28000, to: 30000 }, { field: "payer", from: "p2", to: "p1" }]);
    expect(billChanges(BILLS[0], { name: "Water", usualCents: 28000, category: "Utilities", payer: "p2" })).toEqual([]);
  });
});
