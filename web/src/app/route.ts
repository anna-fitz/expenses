import { useEffect, useState } from "react";
export type Tab = "home" | "history" | "insights" | "settings";
export type Route = { tab: Tab; sub: string | null; id: string | null };
const TABS: Tab[] = ["history", "insights", "settings"];
const HOME_SHEETS = ["add", "edit", "settle"];
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
export function parseRoute(): Route {
  const [t = "", sub = "", id = ""] = location.hash.replace(/^#\/?/, "").split("/").map(dec);
  if (HOME_SHEETS.includes(t)) return { tab: "home", sub: t, id: sub || null };
  return TABS.includes(t as Tab) ? { tab: t as Tab, sub: sub || null, id: id || null } : { tab: "home", sub: null, id: null };
}
const isSheet = (r: Route) => r.sub === "add" || r.sub === "edit" || r.sub === "settle"
  || (r.tab === "settings" && r.id === "password") || (r.tab === "settings" && r.sub === "bills" && !!r.id);
// Sheets live in the URL so the phone's Back gesture closes them. `opened` counts sheets this app pushed:
// closing one of those steps back (so Back won't reopen it); a sheet reached by a link is replaced instead.
let opened = 0;
addEventListener("hashchange", () => { if (!isSheet(parseRoute())) opened = 0; });
export function openSheet(hash: string) { opened++; location.hash = hash; }
export function closeSheet(fallback: string) { if (opened > 0) { opened--; history.back(); } else location.replace(fallback); }
export function useRoute() {
  const [r, setR] = useState<Route>(parseRoute);
  useEffect(() => { const f = () => setR(parseRoute()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return r;
}
