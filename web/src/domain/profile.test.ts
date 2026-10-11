import { describe, expect, it } from "vitest";
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
