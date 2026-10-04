import { describe, expect, it } from "vitest";
import type { Bill } from "@/data/types";
import { billNamed, withoutBills } from "./bills";

const BILLS = [{ id: "water", name: "Water" }, { id: "gas-bill", name: "Gas bill", active: false }] as Bill[];
describe("bills are their own flow", () => {
  it("leave the store list, retired ones included", () =>
    expect(withoutBills([{ id: "costco", name: "Costco" }, { id: "water", name: "Water" }, { id: "gas-bill", name: "Gas bill" }], BILLS).map((s) => s.id))
      .toEqual(["costco"]));
  it("catch a store row whose name matches a bill, whatever its id", () =>
    expect(withoutBills([{ id: "h2o", name: "WATER" }], BILLS)).toEqual([]));
  it("recognize a typed bill name, ignoring case and spacing", () => {
    expect(billNamed(BILLS, "  water ")?.id).toBe("water");
    expect(billNamed(BILLS, "gas  BILL")?.id).toBe("gas-bill");
    expect(billNamed(BILLS, "wat")).toBeNull();
    expect(billNamed(BILLS, "")).toBeNull();
  });
});
