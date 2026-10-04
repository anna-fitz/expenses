import { describe, expect, it } from "vitest";
import { SORTED_CATEGORIES, categoryChoice, categoryOptions, categoryValue } from "./categories";

const ORDER = ["Car & fuel", "Coffee", "Dining & takeout", "Drinks & smoke shop", "Gifts & occasions", "Groceries", "Home & household",
  "Pets", "Pool & yard", "Travel & fun", "Utilities", "Other"];
const COSTCO = { store: "Costco", category: "Groceries" };
describe("category list", () => {
  it("is A–Z with Other last", () => expect(SORTED_CATEGORIES).toEqual(ORDER));
  it("marks the store's default in place, once", () => {
    const o = categoryOptions(COSTCO);
    expect(o.map((x) => x.value)).toEqual(ORDER);
    expect(o.find((x) => x.value === "Groceries")?.label).toBe("Groceries (default for Costco)");
    expect(o.filter((x) => x.label.includes("(default for"))).toHaveLength(1);
  });
  it("offers Store's default only before a store is chosen", () => {
    expect(categoryOptions(null)[0]).toEqual({ value: "", label: "Store’s default" });
    expect(categoryOptions(COSTCO)[0].value).toBe("Car & fuel");
  });
  it("marks nothing for an older store without a category", () =>
    expect(categoryOptions({ store: "Old Place", category: "" }).some((x) => x.label.includes("(default for"))).toBe(false));
  it("keeps a category that's no longer in the list", () =>
    expect(categoryOptions(COSTCO, "Gardening").at(-1)).toEqual({ value: "Gardening", label: "Gardening" }));
  it("shows the default as selected, and picking it means 'the default'", () => {
    expect([categoryValue("", COSTCO), categoryValue("Coffee", COSTCO), categoryValue("", { store: "Old", category: "" }), categoryValue("", null)])
      .toEqual(["Groceries", "Coffee", "Other", ""]);
    expect([categoryChoice("Groceries", COSTCO), categoryChoice("Coffee", COSTCO), categoryChoice("Other", { store: "Old", category: "" }), categoryChoice("Coffee", null)])
      .toEqual(["", "Coffee", "", "Coffee"]);
  });
});
