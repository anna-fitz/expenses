import { describe, expect, it } from "vitest";
import { canonicalName, pickerStores, planRename, removedStores } from "./stores.js";

const M = {
  "trader-joes": { name: "Trader Joe's", category: "Groceries" },
  tjs: { name: "TJs", category: "Groceries", hidden: true, mergedInto: "trader-joes" },
  tj: { name: "TJ", hidden: true, mergedInto: "tjs" },
  "loop-a": { name: "Loop A", hidden: true, mergedInto: "loop-b" },
  "loop-b": { name: "Loop B", hidden: true, mergedInto: "loop-a" },
  gone: { name: "Gone", hidden: true },
  costco: { name: "Costco", category: "Groceries" },
};
describe("stores", () => {
  it("resolves alias chains", () => expect([canonicalName(M, "TJ"), canonicalName(M, "TJs")]).toEqual(["Trader Joe's", "Trader Joe's"]));
  it("keeps unknown names and survives cycles", () => {
    expect(canonicalName(M, "Unknown Place")).toBe("Unknown Place");
    expect(typeof canonicalName(M, "Loop A")).toBe("string");
  });
  it("lists visible canonical stores A–Z", () => expect(pickerStores(M, "").map((s) => s.name)).toEqual(["Costco", "Trader Joe's"]));
  it("finds a store by an old name", () =>
    expect(pickerStores(M, "tjs").map((s) => [s.name, s.alsoCalled, s.exact])).toEqual([["Trader Joe's", "TJs", true]]));
  it("lists removed stores", () => expect(removedStores(M).map((s) => s.id)).toEqual(["gone"]));
  it("plans renames", () => {
    expect(planRename(M, "costco", "COSTCO")).toEqual({ kind: "same", name: "COSTCO" });
    expect(planRename(M, "costco", "TJ")).toEqual({ kind: "conflict", targetId: "trader-joes", targetName: "Trader Joe's" });
    expect(planRename(M, "costco", "Costco Wholesale")).toEqual({ kind: "move", newId: "costco-wholesale", name: "Costco Wholesale" });
    expect(planRename(M, "costco", "  ").kind).toBe("empty");
  });
});
