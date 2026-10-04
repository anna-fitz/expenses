import { useState } from "react";

// A tapped choice shows at once, before the write comes back as a new snapshot (a controlled radio would snap back meanwhile).
// Any new `source` (this write echoed, or a change from the other phone) replaces it.
export function usePending<T extends object>(source: T): [T, (patch: Partial<T>) => void] {
  const [p, setP] = useState<{ base: T; patch: Partial<T> } | null>(null);
  const live = p && p.base === source ? p.patch : null;
  return [live ? { ...source, ...live } : source, (patch) => setP({ base: source, patch: { ...live, ...patch } })];
}
