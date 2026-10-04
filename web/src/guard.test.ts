import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Fails if personal data appears in the new app or its tests. Terms live only in the gitignored accounts file.
const ROOT = join(__dirname, "..", ".."), CFG = join(ROOT, "test", "accounts.local.json");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f); return statSync(p).isDirectory() ? (f === "node_modules" || f.startsWith("dist") ? [] : walk(p)) : [p];
});
describe.runIf(existsSync(CFG))("no personal data in code", () => {
  it("web/ and the web tests contain no names, handles, or emails", () => {
    const cfg = JSON.parse(readFileSync(CFG, "utf8"));
    const terms: string[] = [...(cfg.forbidden || []), ...Object.values(cfg).filter((v): v is string => typeof v === "string").map((e) => e.trim().toLowerCase())];
    const files = [...walk(join(ROOT, "web", "src")), join(ROOT, "web", "index.html"),
      ...readdirSync(join(ROOT, "test")).filter((f) => /^(web_|run_web|suite_web_)/.test(f)).map((f) => join(ROOT, "test", f))];
    const hits = files.flatMap((f) => {
      const text = readFileSync(f, "utf8").toLowerCase();
      return terms.filter((t) => t && new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text))
        .map((t) => `${f}: ${t.length}-char term`);
    });
    expect(hits).toEqual([]);
  });
});
