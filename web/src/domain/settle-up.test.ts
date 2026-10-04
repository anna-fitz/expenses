import { describe, expect, it } from "vitest";
import { pendingValid, settlementRecord, venmoUrl } from "./settle";

const e = (amountCents: number, payer: string, split: "half" | "full", date: string) => ({ amountCents, payer, split, date });
const LIST = [e(4512, "p1", "half", "2026-09-29"), e(40000, "p2", "full", "2026-09-30")];
describe("the settle-up record", () => {
  it("matches what the current app writes", () =>
    expect(settlementRecord(LIST, "p1", "p2", "p1", "2026-10-04", 123)).toEqual({
      date: "2026-10-04", createdAt: 123, by: "p1", from: "p1", to: "p2", amountCents: 37744,
      p1Half: 4512, p2Half: 0, p1Full: 0, p2Full: 40000, count: 2, periodStart: "2026-09-29", periodEnd: "2026-09-30" }));
  it("names who pays when b owes a", () =>
    expect(settlementRecord([e(1000, "p1", "half", "2026-09-01")], "p1", "p2", "p2", "2026-10-04", 1)).toMatchObject({ from: "p2", to: "p1", amountCents: 500 }));
  it("closes an even period with no one paying", () =>
    expect(settlementRecord([e(1000, "p1", "half", "2026-09-02"), e(1000, "p2", "half", "2026-09-01")], "p1", "p2", "p1", "2026-10-04", 1))
      .toMatchObject({ from: null, to: null, amountCents: 0, periodStart: "2026-09-01", periodEnd: "2026-09-02" }));
});
describe("Venmo", () => {
  it("builds the pay and request links", () => {
    expect(venmoUrl("sam-test", "pay", 37744, "Shared expenses, Sep 29 – Sep 30"))
      .toBe("https://venmo.com/sam-test?txn=pay&amount=377.44&note=Shared%20expenses%2C%20Sep%2029%20%E2%80%93%20Sep%2030");
    expect(venmoUrl("alex-test", "charge", 500, "x")).toBe("https://venmo.com/alex-test?txn=charge&amount=5.00&note=x");
  });
  it("trusts a pending payment only while it's recent and the balance is unchanged", () => {
    const now = 10 * 3600e3, p = { net: 37744, count: 2, at: now - 3600e3, txn: "pay" as const };
    expect(pendingValid(p, LIST, "p1", "p2", now)).toBe(true);
    expect(pendingValid({ ...p, at: now - 2 * 3600e3 - 1 }, LIST, "p1", "p2", now)).toBe(false);
    expect(pendingValid({ ...p, net: 1 }, LIST, "p1", "p2", now)).toBe(false);
    expect(pendingValid({ ...p, count: 3 }, LIST, "p1", "p2", now)).toBe(false);
    expect(pendingValid(p, [], "p1", "p2", now)).toBe(false);
    expect(pendingValid(null, LIST, "p1", "p2", now)).toBe(false);
  });
});
