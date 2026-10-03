const listeners=[]; let current=null;
const saved=sessionStorage.getItem('mockUser'); if(saved) current=JSON.parse(saved);
export function getAuth(){ return {}; }
export function onAuthStateChanged(a,cb){ listeners.push(cb); setTimeout(()=>cb(current),5); return ()=>{}; }
export async function signInWithEmailAndPassword(a,email,pw){
  await new Promise(r=>setTimeout(r,30));
  if(pw!=='correct-horse') throw {code:'auth/invalid-credential'};
  current={email,uid:'u-'+email}; sessionStorage.setItem('mockUser',JSON.stringify(current)); listeners.forEach(f=>f(current)); return {user:current};
}
export async function signOut(){ current=null; sessionStorage.removeItem('mockUser'); listeners.forEach(f=>f(null)); }
export async function sendPasswordResetEmail(a,email){ window.__resetSent=email; }
