const listeners=[]; let current=null;
const saved=sessionStorage.getItem('mockUser'); if(saved) current=JSON.parse(saved);
export const getAuth = () => ({ get currentUser() { return current; } });
export function onAuthStateChanged(a,cb){ listeners.push(cb); setTimeout(()=>cb(current),5); return ()=>{}; }
export async function signInWithEmailAndPassword(a,email,pw){
  await new Promise(r=>setTimeout(r,30));
  if(pw!=='correct-horse') throw {code:'auth/invalid-credential'};
  current={email,uid:'u-'+email}; sessionStorage.setItem('mockUser',JSON.stringify(current)); listeners.forEach(f=>f(current)); return {user:current};
}
export async function signOut(){ current=null; sessionStorage.removeItem('mockUser'); listeners.forEach(f=>f(null)); }
export async function sendPasswordResetEmail(a,email){ window.__resetSent=email; }
export const EmailAuthProvider = { credential: (email, password) => ({ email, password }) };
export async function reauthenticateWithCredential(user, cred){ if (cred.password !== 'correct-horse') throw {code:'auth/invalid-credential'}; window.__reauthed = true; }
export async function updatePassword(user, pw){ if (window.__needRecent && !window.__reauthed) throw {code:'auth/requires-recent-login'}; window.__newPassword = pw; }
window.__fbAuth = { signOut };
