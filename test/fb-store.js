const store = window.__store = window.__store || {};
if (sessionStorage.getItem('__persist')) Object.assign(store, JSON.parse(sessionStorage.getItem('__store') || '{}'));
const subs=new Set(); let n=0;
const clone=o=>JSON.parse(JSON.stringify(o));
const notify=()=>{ if (sessionStorage.getItem('__persist')) sessionStorage.setItem('__store', JSON.stringify(store)); setTimeout(()=>subs.forEach(f=>f()),0); };
export function initializeFirestore(){ return {db:true}; }
export function persistentLocalCache(){ return {}; }
export function persistentMultipleTabManager(){ return {}; }
export function collection(db,path){ return {kind:'col',path}; }
export function doc(a,...segs){
  if(a&&a.kind==='col'){ const id=segs[0]||('auto'+(++n)+Math.random().toString(36).slice(2,6)); return {kind:'doc',path:a.path+'/'+id,id}; }
  const path=segs.join('/'); return {kind:'doc',path,id:segs[segs.length-1]};
}
export const where=(f,op,v)=>({t:'where',f,op,v});
export const orderBy=(f,d='asc')=>({t:'order',f,d});
export const limit=k=>({t:'limit',k});
export function query(col,...cs){ return {kind:'query',path:col.path,cs}; }
export function increment(k){ return {__inc:k}; }
function mkDoc(path){ const d=store[path]; return {id:path.split('/').pop(),exists:()=>!!d,data:()=>d?clone(d):undefined}; }
function run(q){
  const path=q.path; const cs=q.cs||[];
  let docs=Object.keys(store).filter(p=>p.startsWith(path+'/')&&p.split('/').length===path.split('/').length+1);
  for(const c of cs){ if(c.t==='where') docs=docs.filter(p=>store[p][c.f]===c.v); }
  const o=cs.find(c=>c.t==='order'); if(o) docs.sort((a,b)=>((store[a][o.f]>store[b][o.f])?1:-1)*(o.d==='desc'?-1:1));
  const l=cs.find(c=>c.t==='limit'); if(l) docs=docs.slice(0,l.k);
  const ds=docs.map(mkDoc); return {docs:ds,size:ds.length,empty:!ds.length,metadata:{hasPendingWrites:!!window.__pending,fromCache:false}};
}
export function onSnapshot(target,a,b,c){
  let next=typeof a==='function'?a:b; let err=typeof a==='function'?b:c;
  const f=()=>{ try{ next(target.kind==='doc'?mkDoc(target.path):run(target)); }catch(e){ console.error(e); } };
  subs.add(f); setTimeout(f,5); return ()=>subs.delete(f);
}
function apply(path,data,merge){
  const cur=merge&&store[path]?store[path]:{}; const out=Object.assign({},cur);
  for(const [k,v] of Object.entries(data)){ out[k]=(v&&v.__inc!==undefined)?((cur[k]||0)+v.__inc):v; }
  store[path]=clone(out);
}
const maybeFail=()=>{ if(window.__deny) throw {code:'permission-denied'}; };
export async function setDoc(ref,data,opts){ maybeFail(); apply(ref.path,data,opts&&opts.merge); notify(); }
export async function updateDoc(ref,data){ maybeFail(); if(!store[ref.path]) throw {code:'not-found'}; apply(ref.path,data,true); notify(); }
export async function deleteDoc(ref){ maybeFail(); delete store[ref.path]; notify(); }
export async function getDoc(ref){ return mkDoc(ref.path); }
export async function getDocs(q){ if(window.__slowGetDocs) await new Promise(r=>setTimeout(r,window.__slowGetDocs)); return run(q.kind?q:{path:q.path,cs:[]}); }
export function writeBatch(){ const ops=[]; return {
  set:(r,d,o)=>ops.push(()=>apply(r.path,d,o&&o.merge)),
  update:(r,d)=>ops.push(()=>apply(r.path,d,true)),
  delete:r=>ops.push(()=>{delete store[r.path]}),
  commit:async()=>{ maybeFail(); ops.forEach(f=>f()); notify(); } }; }
export async function terminate(){ window.__terminated = true; }
export async function clearIndexedDbPersistence(){ for (const k of Object.keys(store)) delete store[k]; sessionStorage.removeItem('__store'); }
window.__fbStore = { setDoc, doc, writeBatch };
