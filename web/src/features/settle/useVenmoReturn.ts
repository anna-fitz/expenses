import { useEffect, useRef } from "react";
import { openSheet, type Route } from "@/app/route";
import { useData } from "@/data/data";
import { clearPending, readPending } from "@/data/venmo";
import { pendingValid } from "@/domain/settle";

// Coming back from Venmo (or reopening the app): if a payment is pending and still matches, open Settle up to ask.
// It checks when the app opens and when the page becomes visible again — not on every navigation, so closing
// Settle up doesn't bounce it back open. Never over another sheet or page: that check waits, and asks once
// you're back on a tab screen.
export function useVenmoReturn(route: Route) {
  const { people, expenses, loaded } = useData();
  const latest = useRef({ route, expenses, loaded }); latest.current = { route, expenses, loaded };
  const waiting = useRef(false);
  const check = useRef(() => {});
  check.current = () => {
    const { route: r, expenses: list, loaded: ready } = latest.current;
    if (!ready || document.visibilityState !== "visible") return;
    const p = readPending();
    if (!p) { waiting.current = false; return; }
    if (!pendingValid(p, list, people.a, people.b, Date.now())) { waiting.current = false; clearPending(); return; }
    if (r.tab === "home" && r.sub === "settle") { waiting.current = false; return; }   // Settle up is open: it asks for itself
    if (r.sub) { waiting.current = true; return; }   // another sheet or page: wait until you're back on a tab screen
    waiting.current = false;
    openSheet("#/settle");
  };
  useEffect(() => { if (loaded) check.current(); }, [loaded]);   // the app opening
  useEffect(() => {
    const f = () => check.current();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  useEffect(() => { if (!route.sub && waiting.current) check.current(); }, [route.sub]);   // back on a tab screen after waiting
}
