import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const block = (sel: string) => { const s = css.indexOf(`${sel} {`); return s < 0 ? "" : css.slice(s, css.indexOf("\n}", s)); };
const REQUIRED = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
  "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--destructive", "--border", "--input", "--ring",
  ...["warning", "success", "danger"].flatMap((r) => ["bg", "border", "fg", "icon"].map((k) => `--${r}-${k}`)),
  ...Array.from({ length: 8 }, (_, i) => `--chart-${i + 1}`),
  "--person-a", "--person-b", "--person-a-ink", "--person-b-ink",
];
describe("design tokens", () => {
  for (const sel of [":root", ".dark"]) it(`${sel} defines every token`, () =>
    expect(REQUIRED.filter((v) => !block(sel).includes(`${v}:`))).toEqual([]));
  it("uses the Zinc values", () => {
    expect(block(":root")).toContain("--background: #FAFAFA;");
    expect(block(":root")).toContain("--card: #FFFFFF;");
    expect(block(".dark")).toContain("--background: #09090B;");
    expect(block(".dark")).toContain("--card: #18181B;");
  });
  it("sets the radius for 14px controls and 20px cards", () => expect(block(":root")).toContain("--radius: 1rem;"));
});
