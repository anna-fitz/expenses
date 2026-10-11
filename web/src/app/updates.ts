import { registerSW } from "virtual:pwa-register";
import { parseRoute } from "./route";

// Busy: something is open or being typed (a sheet or drawer, a page under a tab like Profile, whose fields keep
// unsaved text after they lose focus, onboarding, or a focused field).
const busy = () => !!parseRoute().sub || !!document.querySelector("[role=dialog], #onboarding")
  || !!document.activeElement?.closest("input, textarea, select");
// A new version downloads in the background and applies at a quiet moment — while the app is in the background,
// or on a tab screen with nothing open — never in the middle of adding or editing something.
export function startUpdates() {
  if (!("serviceWorker" in navigator)) return;
  let waiting = false;
  const apply = () => { if (waiting && (document.visibilityState === "hidden" || !busy())) { waiting = false; void update(true); } };
  const update = registerSW({
    onNeedRefresh() { waiting = true; apply(); },
    onRegisteredSW(_url, reg) {
      // Coming back to the app checks for a newer version.
      if (reg) document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void reg.update(); });
    },
  });
  document.addEventListener("visibilitychange", apply);
  addEventListener("hashchange", () => setTimeout(apply, 400));
  document.addEventListener("focusout", () => setTimeout(apply, 400));
}
