import type { Person, Profile } from "@/data/types";

// [light, dark]. Validated with the dataviz palette checker (2026-10-04).
export const PERSON_COLORS = {
  blue: ["#2a78d6", "#3987e5"], orange: ["#eb6834", "#d95926"], aqua: ["#1baf7a", "#199e70"],
  magenta: ["#e87ba4", "#d55181"], green: ["#008300", "#008300"], violet: ["#4a3aa7", "#9085e9"],
} as const;
export type ColorKey = keyof typeof PERSON_COLORS;
const ORDER_DEFAULTS: [ColorKey, ColorKey] = ["violet", "green"];
const LEGACY: Record<string, ColorKey> = { plum: "violet", teal: "aqua", coral: "orange", rose: "magenta", amber: "orange", slate: "blue" };
const CLASH: [ColorKey, ColorKey][] = [["blue", "violet"], ["orange", "magenta"], ["orange", "green"], ["aqua", "magenta"], ["aqua", "green"]];

export const clashes = (x: ColorKey, y: ColorKey) => x === y || CLASH.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
export function colorKey(raw: string | undefined, fallback: ColorKey): ColorKey {
  if (raw && raw in PERSON_COLORS) return raw as ColorKey;
  return (raw && LEGACY[raw]) || fallback;
}
export function resolveColors(profiles: Partial<Record<Person, Profile>>, a: Person, b: Person) {
  const pa = profiles[a] || {}, pb = profiles[b] || {};
  const out: Record<Person, ColorKey> & { moved: Person | null } = Object.assign(
    { [a]: colorKey(pa.color, ORDER_DEFAULTS[0]), [b]: colorKey(pb.color, ORDER_DEFAULTS[1]) }, { moved: null as Person | null });
  if (clashes(out[a], out[b])) {
    const later = (pa.updatedAt || 0) > (pb.updatedAt || 0) ? a : b, keep = later === a ? out[b] : out[a];
    out[later] = (Object.keys(PERSON_COLORS) as ColorKey[]).find((c) => !clashes(c, keep))!;
    out.moved = later;
  }
  return out;
}
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export function inkOn(hex: string): "#FFFFFF" | "#09090B" {
  const L = lum(hex);
  return 1.05 / (L + 0.05) >= (L + 0.05) / (lum("#09090B") + 0.05) ? "#FFFFFF" : "#09090B";
}
