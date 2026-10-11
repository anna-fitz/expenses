import { registerSW } from "virtual:pwa-register";

// Busy: something is open or being typed (a sheet or drawer, onboarding, or a focused field).
const busy = () => !!document.querySelector("[role=dialog], #onboarding")
  || !!document.activeElement?.closest("input, textarea, select");
// A new version downloads in the background and applies at a quiet moment — while the app is in the background,
// or on a screen with nothing open — never in the middle of adding or editing something.
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
