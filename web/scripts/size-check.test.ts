import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { measure, overBudget } from "./size-check.mjs";

// A tiny build: index.html loads two scripts; a third file exists but isn't loaded up front.
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "size-")); mkdirSync(join(dir, "assets"));
  const files = { "assets/index-a.js": "a".repeat(5000) + Math.random(), "assets/vendor-b.js": "let x = 1;\n".repeat(2000), "assets/lazy-c.js": "c" };
  for (const [f, body] of Object.entries(files)) writeFileSync(join(dir, f), body);
  writeFileSync(join(dir, "index.html"), '<script type="module" src="./assets/index-a.js"></script><link rel="modulepreload" href="./assets/vendor-b.js">');
  return { dir, gz: (f: keyof typeof files) => gzipSync(files[f]).length };
}
describe("size check", () => {
  it("adds up what index.html loads up front, and the app's own code", () => {
    const { dir, gz } = fixture(), m = measure(dir);
    expect(Object.keys(m.sizes).sort()).toEqual(["assets/index-a.js", "assets/vendor-b.js"]);
    expect([m.initial, m.app]).toEqual([gz("assets/index-a.js") + gz("assets/vendor-b.js"), gz("assets/index-a.js")]);
  });
  it("names what's over budget", () => {
    const m = { sizes: {}, initial: 500, app: 50 };
    expect(overBudget(m, { initial: 1000, app: 100 })).toEqual([]);
    expect(overBudget(m, { initial: 400, app: 10 })).toEqual(["first download", "the app's own code"]);
  });
});
