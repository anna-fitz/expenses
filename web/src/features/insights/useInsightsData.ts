import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/data/firebase";
import type { Expense } from "@/data/types";
import type { HistoryDoc } from "@/domain/insights";

// undefined while loading; null when there's no summary.
export function useHistory(): HistoryDoc | null | undefined {
  const [h, setH] = useState<HistoryDoc | null | undefined>(undefined);
  useEffect(() => onSnapshot(doc(db, "config", "history"), (s) => setH(s.exists() ? (s.data() as HistoryDoc) : null), () => setH(null)), []);
  return h;
}
// Every expense since `from` (YYYY-MM-DD), settled ones too. A single-field range query, cached offline like the rest.
export function useExpensesSince(from: string): Expense[] | undefined {
  const [l, setL] = useState<Expense[] | undefined>(undefined);
  useEffect(() => onSnapshot(query(collection(db, "expenses"), where("date", ">=", from)),
    (s) => setL(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense)), () => setL([])), [from]);
  return l;
}
