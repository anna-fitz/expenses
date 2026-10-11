import { describe, expect, it } from "vitest";
import { clashes, colorKey, inkOn, resolveColors } from "./people";

describe("people colors", () => {
  it("knows which pairs are too close", () => {
    expect(clashes("blue", "violet")).toBe(true); expect(clashes("orange", "green")).toBe(true);
    expect(clashes("violet", "green")).toBe(false); expect(clashes("aqua", "aqua")).toBe(true);
  });
  it("maps legacy keys", () =>
    expect(["plum", "teal", "coral", "rose", "amber", "slate", "green", "blue"].map((k) => colorKey(k, "blue")))
      .toEqual(["violet", "aqua", "orange", "magenta", "orange", "blue", "green", "blue"]));
  it("defaults by member order", () => expect(resolveColors({}, "p1", "p2")).toEqual({ p1: "violet", p2: "green", moved: null }));
  it("moves the later saver on a clash", () => {
    const r = resolveColors({ p1: { color: "blue", updatedAt: 1 }, p2: { color: "violet", updatedAt: 2 } }, "p1", "p2");
    expect(r.p1).toBe("blue"); expect(r.moved).toBe("p2"); expect(clashes(r.p1, r.p2)).toBe(false);
  });
  it("picks readable initials", () => { expect(inkOn("#e87ba4")).toBe("#09090B"); expect(inkOn("#4a3aa7")).toBe("#FFFFFF"); });
});
