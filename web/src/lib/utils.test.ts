import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps type-scale sizes next to text colors", () =>
    expect(cn("text-label text-muted-foreground", "text-foreground")).toBe("text-label text-foreground"));
  it("lets a later type-scale size win", () => expect(cn("text-sm", "text-caption")).toBe("text-caption"));
  it("knows the hero size", () => expect(cn("text-hero tabular-nums", "text-muted-foreground")).toBe("text-hero tabular-nums text-muted-foreground"));
});
