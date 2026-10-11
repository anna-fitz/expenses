import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
describe("type scale", () => {
  it("has the hero size for the amount being entered", () => {
    for (const d of ["--text-hero: 3.5rem;", "--text-hero--line-height: 3.75rem;", "--text-hero--font-weight: 600;", "--text-hero--letter-spacing: -0.02em;"])
      expect(css).toContain(d);
  });
});
