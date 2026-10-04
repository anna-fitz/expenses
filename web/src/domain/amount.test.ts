import { describe, expect, it } from "vitest";
import { MAX_CENTS, amountText, centsToBuf, pressKey, toCents } from "./amount";

const type = (s: string, from = "") => [...s].reduce((b, k) => pressKey(b, k), from);
describe("number pad", () => {
  it("types dollars and cents", () => expect(type("45.12")).toBe("45.12"));
  it("allows one dot and two decimals", () => { expect(type("1..234")).toBe("1.23"); expect(type(".5")).toBe("0.5"); });
  it("drops a leading zero", () => expect(type("007")).toBe("7"));
  it("caps whole dollars at 7 digits", () => expect(type("123456789")).toBe("1234567"));
  it("deletes the last character", () => { expect(pressKey("45.1", "back")).toBe("45."); expect(pressKey("", "back")).toBe(""); });
  it("ignores anything else", () => expect(pressKey("4", "x")).toBe("4"));
});
describe("amounts", () => {
  it("reads cents", () => {
    expect([toCents("45.12"), toCents("$1,200"), toCents("0.5")]).toEqual([4512, 120000, 50]);
    expect([toCents(""), toCents("."), toCents("abc"), toCents("1.234")]).toEqual([null, null, null, null]);
  });
  it("shows what was typed", () =>
    expect(["", "12", "0.", "1234567.5"].map(amountText)).toEqual(["$0", "$12", "$0.", "$1,234,567.5"]));
  it("fills the pad from cents", () => expect(centsToBuf(64555)).toBe("645.55"));
  it("caps at $100,000", () => expect(MAX_CENTS).toBe(10_000_000));
});
