import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { C } from "@/domain/copy.js";
import { db } from "./firebase";
import { seedIfEmpty } from "./seed";
import type { Bill, Expense, Merchant, People, Person, Profile, Settings, Settlement } from "./types";

export type Data = {
  people: People; loaded: boolean; expenses: Expense[]; settlements: Settlement[]; merchants: Record<string, Merchant>;
  bills: Bill[]; profiles: Partial<Record<Person, Profile>>; settings: Partial<Settings>;
};
const DataContext = createContext<Data | null>(null);

export function DataProvider({ people, children }: { people: People; children: ReactNode }) {
  const [d, setD] = useState<Data>({ people, loaded: false, expenses: [], settlements: [], merchants: {}, bills: [], profiles: {}, settings: {} });
  useEffect(() => {
    const patch = (p: Partial<Data> | ((prev: Data) => Partial<Data>)) => setD((prev) => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
    const fail = (e: { code?: string }) => { console.error(e); if (e.code === "permission-denied") toast.error(C.cantRead); };
    const unsubs = [
      onSnapshot(query(collection(db, "expenses"), where("settled", "==", false)),
        (s) => patch({ loaded: true, expenses: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Expense) }), fail),
      onSnapshot(query(collection(db, "settlements"), orderBy("createdAt", "desc"), limit(200)),
        (s) => patch({ settlements: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Settlement) }), fail),
      onSnapshot(collection(db, "merchants"), (s) => {
        const m: Record<string, Merchant> = {}; s.docs.forEach((x) => { m[x.id] = x.data() as Merchant; }); patch({ merchants: m });
      }, fail),
      onSnapshot(collection(db, "bills"), (s) => patch({ bills: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Bill) }), fail),
      ...[people.a, people.b].map((p) => onSnapshot(doc(db, "config", `profile-${p}`),
        (s) => patch((prev) => ({ profiles: { ...prev.profiles, [p]: s.exists() ? (s.data() as Profile) : {} } })), fail)),
      onSnapshot(doc(db, "config", "settings"), (s) => patch({ settings: s.exists() ? (s.data() as Settings) : {} }), fail),
    ];
    void seedIfEmpty(people.me, people.b);
    return () => unsubs.forEach((u) => u());
  }, [people]);
  return <DataContext.Provider value={d}>{children}</DataContext.Provider>;
}
export function useData() { const d = useContext(DataContext); if (!d) throw new Error("useData outside DataProvider"); return d; }
