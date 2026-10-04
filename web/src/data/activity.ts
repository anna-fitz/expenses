import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import type { Change } from "@/domain/expenses";
import { db } from "./firebase";
import type { Person } from "./types";

export type Activity = { id: string; at: number; by: Person; action: string; kind?: string; summary?: Record<string, unknown>; changes?: Change[] };
// The newest `max` entries, live. Raising `max` keeps showing the current list until the longer one arrives.
export function useActivity(max: number) {
  const [s, setS] = useState<{ loaded: boolean; error: boolean; list: Activity[] }>({ loaded: false, error: false, list: [] });
  useEffect(() => onSnapshot(query(collection(db, "activity"), orderBy("at", "desc"), limit(max)),
    (snap) => setS({ loaded: true, error: false, list: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Activity) }),
    (e) => { console.error(e); setS((p) => ({ ...p, loaded: true, error: true })); }), [max]);
  return s;
}
