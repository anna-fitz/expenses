// Fails the production build if the JavaScript a phone downloads to open the app grows past the budget.
// Sizes are compressed (gzip), as phones download them. Two budgets: everything index.html loads up front,
// and the app's own code (the part that changes with every update).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const KB = 1024;
export const BUDGET = { initial: 340 * KB, app: 60 * KB };
export function measure(dist) {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const files = [...new Set([...html.matchAll(/(?:src|href)="(?:\.\/|\/)?(assets\/[^"]+\.js)"/g)].map((m) => m[1]))];
  const sizes = Object.fromEntries(files.map((f) => [f, gzipSync(readFileSync(join(dist, f))).length]));
  const total = (pick) => Object.entries(sizes).filter(([f]) => pick(f)).reduce((n, [, s]) => n + s, 0);
  return { sizes, initial: total(() => true), app: total((f) => /^assets\/index-/.test(f)) };
}
export const overBudget = (m, budget = BUDGET) =>
  [m.initial > budget.initial && "first download", m.app > budget.app && "the app's own code"].filter(Boolean);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const m = measure(process.argv[2] || "dist"), kb = (n) => `${(n / KB).toFixed(1).padStart(7)} KB`;
  for (const [f, s] of Object.entries(m.sizes)) console.log(`${kb(s)}  ${f}`);
  console.log(`${kb(m.initial)}  first download (budget ${BUDGET.initial / KB} KB)`);
  console.log(`${kb(m.app)}  the app's own code (budget ${BUDGET.app / KB} KB)`);
  const over = overBudget(m);
  if (over.length) { console.error(`Over the size budget: ${over.join(", ")}.`); process.exit(1); }
}
