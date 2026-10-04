import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Person, Profile, Settings } from "./types";
import { writeFailed } from "./writes";

// Merge only what changed, plus when — the same fields the current app writes. Not logged in Activity (as today).
export function saveProfile(me: Person, patch: Partial<Profile>) {
  setDoc(doc(db, "config", `profile-${me}`), { ...patch, updatedAt: Date.now() }, { merge: true }).catch(writeFailed);
}
export function saveSettings(by: Person, patch: Partial<Settings>) {
  setDoc(doc(db, "config", "settings"), { ...patch, updatedAt: Date.now(), updatedBy: by }, { merge: true }).catch(writeFailed);
}
