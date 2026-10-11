import { describe, expect, it } from "vitest";
import { buildHistory, itemsOf, sortItem, type Item } from "./historyImport";
import { serialToISO, type Sheet } from "./xlsx";

// Made-up tabs in the old spreadsheet's two layouts. Never real data.
const v = (x: string | number) => ({ v: String(x) });
const tab = (name: string, cells: Record<string, { v: string; f?: string }>): Sheet => ({ name, cells });
const D = (iso: string) => String((Date.parse(iso) - Date.UTC(1899, 11, 30)) / 86400000);
const it_ = (name: string, cents = 1000, fuelTab = false): Item => ({ name, date: "2025-01-10", cents, fuelTab });

describe("reading a tab", () => {
  const t = tab("t", {
    A1: v("Ralphs"), B1: v(D("2025-01-03")), C1: v(54.1),
    A2: v("Gas (Jan)"), B2: v(D("2025-01-20")), C2: v(20),
    A3: v("Pool service (Jan - Feb)"), B3: v("1/5 - 2/28"), C3: v(240),
    A4: v("Target"), B4: v(D("2016-01-25")), C4: v(30),            // a typo'd year
    A5: v("Total Wine"), B5: v(D("2025-01-04")), C5: v(40),          // a store, not a total row
    E1: v("Costco"), F1: v(D("2025-01-08")), G1: v(100),
    E2: v("Gas"), F2: v(D("2025-01-09")), G2: v(45),
    B9: v("Total"), C9: { v: "384.1", f: "SUM(C1:C8)" }, F9: v("Total"), G9: { v: "145", f: "SUM(G1:G12)" },
    G10: { v: "72.5", f: "G9/2" }, F10: v("Kyle Half"),               // inside a widened range, but worked out from other cells
  });
  const items = itemsOf(t);
  it("reads both lists and nothing else", () => {
    expect(items.map((x) => x.name).sort()).toEqual(["Costco", "Gas", "Gas (Jan)", "Pool service (Jan - Feb)", "Ralphs", "Target", "Total Wine"]);
    expect(items.reduce((s, x) => s + x.cents, 0)).toBe(52910);
  });
  it("fixes text dates and typos from the tab's own dates", () => {
    expect(items.find((x) => x.name.startsWith("Pool"))!.date).toBe("2025-01-05");
    expect(items.find((x) => x.name === "Target")!.date.slice(0, 7)).toBe("2025-01");
  });
  it("a tab without a date column reads the place next to the amount", () => {
    const t2 = tab("t2", { A1: v("Ralphs"), B1: v(D("2020-04-10")), C1: v(10), F1: v("Aldi"), G1: v(20),
      C9: { v: "10", f: "SUM(C1:C5)" }, G9: { v: "20", f: "SUM(G1:G5)" } });
    expect(itemsOf(t2).map((x) => [x.name, x.date])).toEqual([["Ralphs", "2020-04-10"], ["Aldi", "2020-04-10"]]);
  });
});

describe("sorting", () => {
  it("bills by their app ids", () => {
    expect(sortItem(it_("Electricity (Feb)"))).toEqual({ kind: "bill", billId: "electricity" });
    expect(sortItem(it_("Internet (Mar)"))).toEqual({ kind: "bill", billId: "internet" });
    expect(sortItem(it_("Pool Service (June & July)"))).toEqual({ kind: "bill", billId: "pool-service" });
    expect(sortItem(it_("Gardeners (Aug & Sept)"))).toEqual({ kind: "bill", billId: "gardener" });
    expect(sortItem(it_("Water bill (June & July cycle)"))).toEqual({ kind: "bill", billId: "water" });
  });
  it("plain Gas is the gas bill, unless the tab lists the bill by month", () => {
    expect(sortItem(it_("Gas"))).toEqual({ kind: "bill", billId: "gas-bill" });
    expect(sortItem(it_("Gas", 4500, true))).toEqual({ kind: "spend", category: "Car & fuel", oneOff: false });
    expect(sortItem(it_("March Gas"))).toEqual({ kind: "bill", billId: "gas-bill" });
  });
  it("specific phrases before the store", () => {
    expect(sortItem(it_("Amazon (dog toys)"))).toMatchObject({ category: "Pets" });
    expect(sortItem(it_("Costco food bar"))).toMatchObject({ category: "Dining & takeout" });
    expect(sortItem(it_("Target (groceries)"))).toMatchObject({ category: "Groceries" });
    expect(sortItem(it_("Ralphs"))).toMatchObject({ category: "Groceries" });
    expect(sortItem(it_("Trade coffee"))).toMatchObject({ category: "Coffee" });
    expect(sortItem(it_("Coffee table", 45000))).toMatchObject({ category: "Home & household", oneOff: true });
  });
  it("one-offs: projects from $50, anything else from $300 except groceries and household runs", () => {
    expect(sortItem(it_("Toilet repair parts", 2311))).toMatchObject({ oneOff: false });
    expect(sortItem(it_("Fence", 291000))).toMatchObject({ oneOff: true });
    expect(sortItem(it_("Petsmart hotel", 60400))).toMatchObject({ category: "Pets", oneOff: true });
    expect(sortItem(it_("Costco", 49747))).toMatchObject({ category: "Groceries", oneOff: false });
    expect(sortItem(it_("Target", 32998))).toMatchObject({ category: "Home & household", oneOff: false });
  });
  it("unknown places are Other", () => expect(sortItem(it_("Somewhere new"))).toMatchObject({ category: "Other" }));
});

describe("the summary", () => {
  const t = tab("t", {
    A1: v("Ralphs"), B1: v(D("2025-01-03")), C1: v(50), A2: v("Electricity (Jan)"), B2: v(D("2025-01-20")), C2: v(100),
    A3: v("Fence"), B3: v(D("2025-02-02")), C3: v(2000), A4: v("Ralphs"), B4: v(D("2025-03-01")), C4: v(20),
    C9: { v: "2170", f: "SUM(C1:C8)" },
  });
  it("totals by month, category and bill", () => {
    const p = buildHistory([t], null);
    expect(p.history).toEqual({ through: "2025-03", months: {
      "2025-01": { cats: { Groceries: 5000 }, bills: { electricity: 10000 }, oneOffs: {}, oneOffCount: 0 },
      "2025-02": { cats: {}, bills: {}, oneOffs: { "Home & household": 200000 }, oneOffCount: 1 },
      "2025-03": { cats: { Groceries: 2000 }, bills: {}, oneOffs: {}, oneOffCount: 0 } } });
    expect(p).toMatchObject({ items: 4, tabs: 1, oneOffs: 1, dropped: 0, first: "2025-01", totalCents: 217000 });
  });
  it("stops the month before the app's first expense", () => {
    const p = buildHistory([t], "2025-03-04");
    expect(p.through).toBe("2025-02");
    expect(Object.keys(p.history.months)).toEqual(["2025-01", "2025-02"]);
    expect(p.dropped).toBe(1);
  });
  it("spreadsheet day numbers", () => expect(serialToISO(46234)).toBe("2026-07-31"));
});
