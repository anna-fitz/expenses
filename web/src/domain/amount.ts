// The number pad's buffer ("45.12"), and reading typed amounts as integer cents.
export const MAX_CENTS = 10_000_000;
export function pressKey(buf: string, k: string): string {
  if (k === "back") return buf.slice(0, -1);
  if (k === ".") return buf.includes(".") ? buf : (buf || "0") + ".";
  if (!/^[0-9]$/.test(k)) return buf;
  const [i, d] = buf.split(".");
  if (d !== undefined) return d.length < 2 ? buf + k : buf;
  return i.length < 7 ? (i === "0" ? "" : i) + k : buf;
}
export function toCents(str: string): number | null {
  const v = String(str).replace(/[$,\s]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(v) || v === "" || v === ".") return null;
  return Math.round(parseFloat(v) * 100);
}
export function amountText(buf: string): string {
  if (!buf) return "$0";
  const [i, d] = buf.split(".");
  return `$${Number(i || "0").toLocaleString("en-US")}${d !== undefined ? "." + d : ""}`;
}
export const centsToBuf = (c: number) => (c / 100).toFixed(2);
