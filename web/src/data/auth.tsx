import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, sha256 } from "./firebase";
import type { People } from "./types";

export type AuthState =
  | { status: "loading" } | { status: "signedOut" }
  | { status: "denied"; user: User } | { status: "member"; user: User; people: People };
const AuthContext = createContext<AuthState>({ status: "loading" });
type Members = Record<string, { id: string; name: string }>;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setState({ status: "signedOut" });
    try {
      const snap = await getDoc(doc(db, "config", "people"));
      const members: Members = (snap.exists() && (snap.data() as { members?: Members }).members) || {};
      const mine = members[await sha256(String(user.email || "").trim().toLowerCase())];
      const ids = Object.values(members).map((m) => m.id).sort();
      if (!mine || ids.length !== 2) return setState({ status: "denied", user });
      const names = Object.fromEntries(Object.values(members).map((m) => [m.id, m.name]));
      setState({ status: "member", user, people: { me: mine.id, them: ids.find((i) => i !== mine.id)!, a: ids[0], b: ids[1], names } });
    } catch { setState({ status: "denied", user }); }
  }), []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
