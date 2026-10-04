import type { VenmoPending } from "@/domain/settle";

// A short-lived note on this phone that a Venmo payment is in progress. Same key and shape as the current app,
// so a note left by either app is honored, and signing out (session.ts) erases it.
const KEY = "venmoPending";
export function readPending(): VenmoPending | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
export function writePending(p: VenmoPending) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ } }
export function clearPending() { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } }
