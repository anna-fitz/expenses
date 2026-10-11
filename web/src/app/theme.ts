import type { Theme } from "@/data/types";
const mq = () => matchMedia("(prefers-color-scheme: dark)");
let current: Theme = "system";
function paint() {
  const dark = current === "dark" || (current === "system" && mq().matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = current === "system" ? (m.media.includes("dark") ? "#09090B" : "#FAFAFA") : dark ? "#09090B" : "#FAFAFA";
  });
}
if (typeof window !== "undefined") mq().addEventListener("change", () => { if (current === "system") paint(); });
export function applyTheme(t: Theme | undefined) {
  current = t === "light" || t === "dark" ? t : "system";
  try { localStorage.setItem("theme", current); } catch { /* storage may be blocked */ }
  paint();
}
export function storedTheme(): Theme {
  try { const t = localStorage.getItem("theme"); return t === "light" || t === "dark" ? t : "system"; } catch { return "system"; }
}
