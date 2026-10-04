import { useEffect, useState } from "react";
export type Tab = "home" | "history" | "insights" | "settings";
export type Route = { tab: Tab; sub: string | null };
const TABS: Tab[] = ["history", "insights", "settings"];
export function parseRoute(): Route {
  const [t, sub] = location.hash.replace(/^#\/?/, "").split("/") as [Tab, string?];
  return TABS.includes(t) ? { tab: t, sub: sub || null } : { tab: "home", sub: null };
}
export function useRoute() {
  const [r, setR] = useState<Route>(parseRoute);
  useEffect(() => { const f = () => setR(parseRoute()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return r;
}
