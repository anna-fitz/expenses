import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from "firebase/auth";
import { clearIndexedDbPersistence, doc, setDoc, terminate } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Person } from "./types";

const APP_KEYS = ["venmoPending", "hideInstall"]; // theme stays: it isn't personal data

// Signing out removes the app's copy of the shared data from this phone.
export async function signOutAndErase() {
  try { APP_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* storage may be blocked */ }
  await signOut(auth).catch(() => {});
  await terminate(db).catch(() => {});
  await clearIndexedDbPersistence(db).catch(() => {});
  location.reload();
}
export async function setPassword(newPw: string, currentPw?: string): Promise<"ok" | "needCurrent" | "wrongCurrent" | "failed"> {
  const user = auth.currentUser; if (!user) return "failed";
  try {
    if (currentPw) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email || "", currentPw));
    await updatePassword(user, newPw);
    return "ok";
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/requires-recent-login") return "needCurrent";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "wrongCurrent";
    return "failed";
  }
}
export const markOnboarded = (me: Person) => setDoc(doc(db, "config", `profile-${me}`), { onboarded: true }, { merge: true });
