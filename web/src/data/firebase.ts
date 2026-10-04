import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Public by design: security comes from the Firestore rules, not from hiding this.
const firebaseConfig = {
  apiKey: "AIzaSyA3paZvOZd1s7ojiwimJvf7HJBAEDqxTW4",
  authDomain: "shared-expenses-67ea3.firebaseapp.com",
  projectId: "shared-expenses-67ea3",
  storageBucket: "shared-expenses-67ea3.firebasestorage.app",
  messagingSenderId: "733130056993",
  appId: "1:733130056993:web:5a45e24e1bda04944c0a60",
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = (() => {
  try { return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch { return initializeFirestore(app, {}); }
})();
export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
