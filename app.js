import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, query, where,
  orderBy, limit, onSnapshot, setDoc, getDoc, getDocs, writeBatch, increment }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { fmt, iso, todayISO, parseISO, daysBetween, shortDate, longDate, dayLabel, timeOf, greeting, balanceLine, sinceLine, savedLine, C } from "./copy.js";
import { esc, openLayer, closeLayer, resetLayer, keepFocus, announce, setTitle, toast, hideToast } from "./ui.js";

/* ---------------- Config ---------------- */
// Public by design: security comes from the Firestore rules, not from hiding this.
const firebaseConfig = {
  apiKey: "AIzaSyA3paZvOZd1s7ojiwimJvf7HJBAEDqxTW4",
  authDomain: "shared-expenses-67ea3.firebaseapp.com",
  projectId: "shared-expenses-67ea3",
  storageBucket: "shared-expenses-67ea3.firebasestorage.app",
  messagingSenderId: "733130056993",
  appId: "1:733130056993:web:5a45e24e1bda04944c0a60"
};
// SHA-256 of each sign-in email, so the public code never contains the addresses.
const PEOPLE_BY_EMAIL_HASH = {
  "8788d16b6b303ca051d9ff85cada9a8bd8021a029f4598e5e570bcef91960b99": "bre",
  "ab5c5a1b5a7c8708b8f6e33b88a469f2c7a67732c09d9d0ea6b76e720be2019b": "kyle"
};
const PEOPLE = { bre: "Bre", kyle: "Kyle" };
const other = p => (p === "bre" ? "kyle" : "bre");
const CATEGORIES = ["Groceries", "Home & household", "Utilities", "Pool & yard", "Pets", "Dining & takeout", "Coffee",
  "Drinks & smoke shop", "Car & fuel", "Travel & fun", "Gifts & occasions", "Other"];

// Starting data, written once when the database is empty.
const SEED_BILLS = [
  ["electricity", "Electricity", 64555, "Utilities", 1], ["internet", "Internet", 8000, "Utilities", 2],
  ["gas-bill", "Gas bill", 1700, "Utilities", 3], ["water", "Water", 28000, "Utilities", 4],
  ["pool-service", "Pool service", 12000, "Pool & yard", 5], ["gardener", "Gardener", 10000, "Pool & yard", 6]
];
const SEED_STORES = [
  ["Amazon", "Home & household", 61], ["Target", "Home & household", 49], ["Ralphs", "Groceries", 38],
  ["Costco", "Groceries", 20], ["Sprouts", "Groceries", 12], ["Chewy", "Pets", 12], ["Home Depot", "Home & household", 11],
  ["Fuel", "Car & fuel", 10], ["H Mart", "Groceries", 9], ["DoorDash", "Dining & takeout", 6], ["Chipotle", "Dining & takeout", 6],
  ["Total Wine", "Drinks & smoke shop", 4], ["Paris Baguette", "Dining & takeout", 4], ["Trader Joe's", "Groceries", 4],
  ["Aldi", "Groceries", 3], ["Petsmart", "Pets", 3], ["Dog training", "Pets", 3], ["Electricity", "Utilities", 3],
  ["Internet", "Utilities", 3], ["Gas bill", "Utilities", 3], ["Water", "Utilities", 2], ["Pool service", "Pool & yard", 3],
  ["Gardener", "Pool & yard", 2]
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(app, {}); }

/* ---------------- State & helpers ---------------- */
const S = { user: null, me: null, view: "home", expenses: [], merchants: {}, bills: [], settlements: [],
  loaded: false, pending: false, online: navigator.onLine, unsubs: [], layer: null };
const $ = s => document.querySelector(s);
const slug = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "store";
function toCents(str) {
  const v = String(str).replace(/[$,\s]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(v) || v === "" || v === ".") return null;
  return Math.round(parseFloat(v) * 100);
}
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function writeFailed(e) {
  console.error(e);
  if (e && e.code === "permission-denied") toast(C.cantChange);
  else toast(C.cantSave);
}

/* ---------------- Activity log ---------------- */
// One entry per add, edit, delete, or settle-up, written in the same batch as the change.
// Undo removes the expense and its "add-{id}" entry together, so a corrected mistake leaves no trace.
const EDIT_FIELDS = ["amountCents", "payer", "merchant", "category", "date", "split", "note", "covers"];
const summaryOf = e => ({ amountCents: e.amountCents, merchant: e.merchant, payer: e.payer });
function logEntry(b, entry, id) {
  const ref = id ? doc(db, "activity", id) : doc(collection(db, "activity"));
  b.set(ref, Object.assign({ at: Date.now(), by: S.me, expenseId: null, settlementId: null, summary: null, changes: [] }, entry));
}

/* ---------------- Money math ---------------- */
// Positive net = Bre owes Kyle. Summed in half-cents so odd cents never drift.
function calc(list) {
  const t = { kyleHalf: 0, breHalf: 0, kyleFull: 0, breFull: 0 };
  for (const e of list) {
    const a = e.amountCents | 0;
    if (e.split === "full") { if (e.payer === "kyle") t.kyleFull += a; else t.breFull += a; }
    else { if (e.payer === "kyle") t.kyleHalf += a; else t.breHalf += a; }
  }
  const half = (t.kyleHalf - t.breHalf) + 2 * (t.kyleFull - t.breFull);
  t.net = Math.sign(half) * Math.round(Math.abs(half) / 2);
  t.diffHalf = Math.sign(t.kyleHalf - t.breHalf) * Math.round(Math.abs(t.kyleHalf - t.breHalf) / 2);
  return t;
}
function owes(net) {
  if (net === 0) return { who: "You’re even", amt: fmt(0) };
  return net > 0 ? { who: "Bre owes Kyle", amt: fmt(net), from: "bre", to: "kyle" }
                 : { who: "Kyle owes Bre", amt: fmt(-net), from: "kyle", to: "bre" };
}
const sortExp = list => list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));

/* ---------------- Rendering: main screens ---------------- */
function render() {
  const root = $("#app");
  keepFocus(() => {
    if (S.view === "login") { root.innerHTML = loginHTML(); setTitle("Sign in"); return; }
    if (S.view === "denied") { root.innerHTML = deniedHTML(); setTitle("Not set up"); return; }
    if (S.view === "history") { root.innerHTML = historyHTML(); setTitle("History"); return; }
    const scroller = root.querySelector(".scroll"), top = scroller ? scroller.scrollTop : 0;
    root.innerHTML = homeHTML(); if ($("#layer").hidden) setTitle(null);
    const ns = root.querySelector(".scroll"); if (ns) ns.scrollTop = top;
  }, "#app h1");
  if (!$("#layer").hidden) setTitle(($("#layer-title") || {}).textContent || null);
}
function syncLabel() {
  if (!S.online) return C.offline;
  if (S.pending) return C.syncing;
  return "";
}
function loginHTML() {
  return `<div class="frame"><div class="scroll"><form class="login" id="login-form" novalidate>
    <h1>Shared expenses</h1>
    <p class="muted" style="margin:0 0 24px">Sign in with your email and password.</p>
    <label class="label" for="l-email">Email</label>
    <input id="l-email" class="input" type="email" autocomplete="username" inputmode="email" autocapitalize="none" required>
    <label class="label" for="l-pass">Password</label>
    <input id="l-pass" class="input" type="password" autocomplete="current-password" required>
    <p class="err" id="l-err" hidden style="text-align:left"></p>
    <button class="btn primary" style="width:100%;margin-top:22px" id="l-btn">Sign in</button>
    <button type="button" class="link" data-act="forgot" style="margin-top:10px">Forgot password?</button>
  </form></div></div>`;
}
function deniedHTML() {
  return `<div class="frame"><div class="scroll"><div class="login"><h1>Not set up for this app</h1>
    <p class="muted">This account can sign in, but it isn’t one of the two accounts this app is for.</p>
    <button class="btn" style="width:100%" data-act="signout">Sign out</button></div></div></div>`;
}
function installHint() {
  if (isStandalone() || store("hideInstall") === "1") return "";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const how = ios ? "tap Share, then Add to Home Screen." : "open the browser menu, then Install app or Add to Home screen.";
  return `<div class="banner"><p>For the full-screen app, ${how}</p><button class="link" data-act="hide-install" aria-label="Dismiss">Dismiss</button></div>`;
}
function homeHTML() {
  const list = sortExp(S.expenses), t = calc(list), bl = balanceLine(t.net, S.me, PEOPLE), amt = fmt(Math.abs(t.net));
  const last = S.settlements[0], them = other(S.me);
  const mine = S.me === "kyle" ? t.kyleHalf + t.kyleFull : t.breHalf + t.breFull;
  const theirs = S.me === "kyle" ? t.breHalf + t.breFull : t.kyleHalf + t.kyleFull;
  const tot = mine + theirs, myPct = tot ? mine / tot * 100 : 50;
  let rows = "";
  if (!S.loaded) rows = `<p class="muted">Loading expenses…</p>`;
  else if (!list.length) rows = `<div class="card empty"><h2>${esc(C.emptyTitle)}</h2><p class="muted" style="margin:0">${esc(C.emptyBody)}</p></div>`;
  else {
    let cur = null;
    for (const e of list) {
      if (e.date !== cur) { if (cur !== null) rows += `</div></section>`; cur = e.date; rows += `<section class="group"><h2>${esc(dayLabel(e.date))}</h2><div class="rows">`; }
      rows += rowHTML(e, true);
    }
    rows += `</div></section>`;
  }
  const since = sinceLine(list.length, last ? last.date : null, last ? daysBetween(last.date, todayISO()) : 0);
  return `<div class="frame">
    <header class="top"><div class="inner hdr">
      <div class="hello"><h1>${esc(greeting(PEOPLE[S.me], new Date().getHours()))}</h1><span class="sync" id="sync">${esc(syncLabel())}</span></div>
      <button class="link" data-act="history">History</button></div></header>
    <div class="scroll"><div class="inner">
      ${installHint()}
      <section class="hero" aria-label="Current balance">
        <p class="who">${esc(bl.who)}</p><p class="amt">${amt}</p>${bl.sub ? `<p class="sub">${esc(bl.sub)}</p>` : ""}
        <div class="bar" role="img" aria-label="You paid ${fmt(mine)}, ${esc(PEOPLE[them])} paid ${fmt(theirs)}">
          <span style="width:${myPct}%;background:var(--${S.me})"></span><span style="width:${100 - myPct}%;background:var(--${them})"></span></div>
        <div class="legend"><span><span class="dot" style="background:var(--${S.me})"></span>You paid ${fmt(mine)}</span>
          <span><span class="dot" style="background:var(--${them})"></span>${esc(PEOPLE[them])} paid ${fmt(theirs)}</span></div>
        <p class="since">${esc(since)}</p>
        ${list.length ? `<button class="btn" style="width:100%;margin-top:14px" data-act="settle">Settle up</button>` : ""}
      </section>
      ${rows}
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn primary" data-act="add">Add expense</button></div></footer>
  </div>`;
}
function rowHTML(e, editable) {
  const sub = [PEOPLE[e.payer] + " paid", e.category, e.covers].filter(Boolean).join(", ");
  const inner = `<span class="dot" style="background:var(--${e.payer})" aria-hidden="true"></span>
    <span class="main"><span class="t">${esc(e.merchant)}${e.note ? ` <span class="muted" style="font-weight:400">${esc(e.note)}</span>` : ""}</span>
    <span class="s">${esc(sub)}</span></span>
    <span class="amt">${fmt(e.amountCents)}${e.split === "full" ? `<br><span class="tag">Owed in full</span>` : ""}</span>`;
  return editable ? `<button class="row" data-act="edit" data-id="${esc(e.id)}">${inner}</button>` : `<div class="row">${inner}</div>`;
}
function historyHTML() {
  let list = "";
  if (!S.settlements.length) list = `<div class="card empty"><h2>No settle-ups yet</h2><p class="muted" style="margin:0">When you mark a balance as paid, it’s saved here with every expense it covered.</p></div>`;
  else list = `<div class="rows" style="margin-top:8px">` + S.settlements.map(s => {
    const line = s.amountCents ? `${PEOPLE[s.from]} paid ${PEOPLE[s.to]} ${fmt(s.amountCents)}` : "Closed even";
    return `<button class="row" data-act="detail" data-id="${esc(s.id)}"><span class="main"><span class="t">${esc(line)}</span>
      <span class="s">${esc(longDate(s.date))}, ${s.count} expense${s.count === 1 ? "" : "s"}</span></span></button>`;
  }).join("") + `</div>`;
  return `<div class="frame">
    <header class="top"><div class="inner" style="display:flex;align-items:center"><h1>History</h1></div></header>
    <div class="scroll"><div class="inner">${list}
      <div class="card" style="margin-top:28px"><p style="margin:0 0 4px;font-weight:600">Signed in as ${esc(PEOPLE[S.me])}</p>
        <p class="muted small" style="margin:0">${esc(S.user ? S.user.email : "")}</p>
        <div style="display:flex;gap:10px;margin-top:14px"><button class="btn" data-act="reset-pass">Change password</button><button class="btn" data-act="signout">Sign out</button></div>
      </div></div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="home">Back to expenses</button></div></footer>
  </div>`;
}

/* ---------------- Layer helpers ---------------- */
function closeScreen() { A.step = null; S.layer = null; closeLayer(render); }

/* ---------------- Add flow: step 1 amount ---------------- */
const A = {}; // add-flow state
function startAdd() {
  S.layer = "add";
  Object.assign(A, { step: "amount", buf: "", payer: S.me, bill: null, split: "half", date: todayISO(), note: "", covers: "",
    category: "", showOpts: false, q: "", sel: null, newCat: "" });
  renderAmount();
}
function amountDisplay() {
  if (!A.buf) return `<span class="big empty-amt">$0</span>`;
  const [i, d] = A.buf.split(".");
  const int = Number(i || "0").toLocaleString("en-US");
  return `<span class="big">$${int}${d !== undefined ? "." + d : ""}</span>`;
}
function payerFieldset(name, value) {
  const order = [S.me, other(S.me)];
  return `<fieldset class="fs" id="${name}-set"><legend class="label">Paid by</legend><div class="segr">
    ${order.map(p => `<label><input type="radio" name="${name}" value="${p}" ${value === p ? "checked" : ""}><span>${p === S.me ? "You" : esc(PEOPLE[p])}</span></label>`).join("")}
  </div></fieldset>`;
}
function nextLabel() { return A.bill ? `Save ${A.bill.name}, ${fmt(toCents(A.buf || "") || 0)}` : "Next: choose store"; }
function renderAmount() {
  const bills = S.bills.filter(b => b.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Add expense</h1><p class="step">Step 1 of 2</p></div></header>
    <div class="amount-step"><div class="inner">
      <div class="display">
        <div role="group" aria-labelledby="amt-label" aria-describedby="${A.bill ? "" : "amt-hint "}amt-err" class="amt-field">
          <p id="amt-label" class="amt-label">Amount</p>
          <div id="amt">${amountDisplay()}</div>
        </div>
        ${A.bill ? `<div class="billfor">For ${esc(A.bill.name)} <button class="link" data-act="clear-bill">Change</button></div>`
                 : `<p class="help" id="amt-hint">Type it in, or pick a bill.</p>`}
        <p class="err" id="amt-err" hidden></p>
        ${payerFieldset("payer", A.payer)}
      </div>
      ${bills.length && !A.bill ? `<h2 class="label" id="bills-h">Bills</h2>
        <div class="chiprow" role="group" aria-labelledby="bills-h">${bills.map(b => `<button class="chip" data-act="bill" data-id="${esc(b.id)}">${esc(b.name)}<b>${fmt(b.usualCents)}</b></button>`).join("")}</div>` : ""}
      <div class="keys">${keys.map(k => k === "back"
        ? `<button class="key" data-act="key" data-k="back" aria-label="Delete last digit">⌫</button>`
        : `<button class="key" data-act="key" data-k="${k}">${k}</button>`).join("")}</div>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="close">Cancel</button>
      <button class="btn primary grow2" data-act="next">${esc(nextLabel())}</button></div></footer>
  </div>`);
}
let amtTimer;
function announceAmount() { clearTimeout(amtTimer); amtTimer = setTimeout(() => { const el = $("#amt"); if (el) announce("Amount " + el.textContent.trim()); }, 500); }
function pressKey(k) {
  let b = A.buf;
  if (k === "back") b = b.slice(0, -1);
  else if (k === ".") { if (!b.includes(".")) b = (b || "0") + "."; }
  else {
    const [i, d] = b.split(".");
    if (d !== undefined) { if (d.length < 2) b += k; }
    else if (i.length < 7) b = (i === "0" ? "" : i) + k;
  }
  A.buf = b;
  $("#amt").innerHTML = amountDisplay();
  $("#amt-err").hidden = true;
  if (A.bill) $("[data-act=next]").textContent = nextLabel();
  announceAmount();
}
function amountNext() {
  const c = toCents(A.buf || "");
  if (!c) { const e = $("#amt-err"); e.textContent = "Enter an amount"; e.hidden = false; announce("Enter an amount"); return; }
  A.cents = c;
  if (A.bill) {
    saveNew(A.bill.name, A.bill.category || "Utilities", { billId: A.bill.id, covers: new Date().toLocaleDateString("en-US", { month: "long" }) });
    return;
  }
  A.step = "where"; renderWhere();
}

/* ---------------- Add flow: step 2 where ---------------- */
const NEW = "__new__";
function storeList(q) {
  const ql = q.trim().toLowerCase();
  return Object.entries(S.merchants).map(([id, m]) => Object.assign({ id }, m))
    .filter(m => m.name && (!ql || m.name.toLowerCase().includes(ql)))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
const cleanQ = () => A.q.trim().replace(/\s+/g, " ");
function optsSummary() {
  return [A.date === todayISO() ? "Today" : shortDate(A.date), A.split === "full" ? "owed in full" : "split 50/50", A.category || "usual category"].join(" · ");
}
function saveLabel() {
  if (!A.sel) return "Choose a store";
  const name = A.sel === NEW ? cleanQ() : (S.merchants[A.sel] || {}).name;
  return `Save ${fmt(A.cents)} at ${name}`;
}
function splitFieldset(name, value) {
  return `<fieldset class="fs" id="${name}-set"><legend class="label">Split</legend><div class="segr">
    <label><input type="radio" name="${name}" value="half" ${value === "half" ? "checked" : ""}><span>50/50</span></label>
    <label><input type="radio" name="${name}" value="full" ${value === "full" ? "checked" : ""}><span>Owed in full</span></label></div></fieldset>`;
}
const splitHelp = () => A.split === "full" ? `${PEOPLE[other(A.payer)]} pays back the whole ${fmt(A.cents)}.` : `${PEOPLE[other(A.payer)]} owes ${fmt(Math.round(A.cents / 2))}.`;
function renderWhere() {
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Where was it?</h1><p class="step">Step 2 of 2</p>
      <p class="ctx small">${fmt(A.cents)}, paid by ${A.payer === S.me ? "you" : esc(PEOPLE[A.payer])} · <button class="link inline" data-act="back-amount">Edit amount</button></p></div></header>
    <div class="scroll"><div class="inner">
      <label class="label" for="w-q">Store</label>
      <input id="w-q" class="search" placeholder="Search, or type a new one" autocomplete="off" autocapitalize="words" value="${esc(A.q)}">
      <button class="details" data-act="toggle-opts" aria-expanded="${A.showOpts}" aria-controls="w-opts">
        <span>Details: <span id="w-sum">${esc(optsSummary())}</span></span><span aria-hidden="true">${A.showOpts ? "▴" : "▾"}</span></button>
      <div class="panel card" id="w-opts" style="padding:2px 16px 16px" ${A.showOpts ? "" : "hidden"}>${optsPanelHTML()}</div>
      <p class="err left" id="w-err" hidden></p>
      <div id="w-list"></div>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="back-amount">Back</button>
      <button class="btn primary grow2" data-act="save-where" id="w-save">${esc(saveLabel())}</button></div></footer>
  </div>`);
  renderStoreList();
}
function optsPanelHTML() {
  return `<label class="label" for="o-date">Date</label><input id="o-date" class="input" type="date" value="${esc(A.date)}">
    <div style="margin-top:14px">${splitFieldset("o-split", A.split)}</div>
    <p class="help" id="o-split-help">${esc(splitHelp())}</p>
    <label class="label" for="o-cat">Category</label>
    <select id="o-cat" class="input"><option value="">Use the store’s usual category</option>${CATEGORIES.map(c => `<option ${A.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
    <label class="label" for="o-note">Note</label><input id="o-note" class="input" placeholder="Dog food" value="${esc(A.note)}">
    <label class="label" for="o-covers">Covers</label><input id="o-covers" class="input" placeholder="July – September" value="${esc(A.covers)}" aria-describedby="o-covers-help">
    <p class="help" id="o-covers-help">For bills that pay for more than one month.</p>`;
}
function renderStoreList() {
  const box = $("#w-list"); if (!box) return;
  const q = cleanQ(), list = storeList(q);
  const exact = list.find(m => m.name.toLowerCase() === q.toLowerCase());
  if (A.sel && A.sel !== NEW && !list.some(m => m.id === A.sel)) A.sel = null;   // never keep a hidden selection
  if (A.sel === NEW && (!q || exact)) A.sel = null;
  const tile = (value, label, sub) => `<label class="store${value === NEW ? " new" : ""}"><input type="radio" name="store" value="${esc(value)}" ${A.sel === value ? "checked" : ""}>
    <span>${label}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="tick" aria-hidden="true">✓</span></label>`;
  const tiles = (q && !exact ? [tile(NEW, `Add ${esc(q)} as a new store`, "")] : []).concat(list.map(m => tile(m.id, esc(m.name), m.category || "")));
  keepFocus(() => {
    box.innerHTML = (tiles.length
      ? `<fieldset class="fs" aria-describedby="w-err"><legend class="sr">Choose a store</legend><div class="grid">${tiles.join("")}</div></fieldset>`
      : `<p class="muted">Type a store name to add it.</p>`)
      + (A.sel === NEW ? `<label class="label" for="w-cat">Category for ${esc(q)}</label>
        <select id="w-cat" class="input" aria-describedby="w-err"><option value="">Choose a category</option>${CATEGORIES.map(c => `<option ${A.newCat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : "");
  });
  const s = $("#w-save"); if (s) s.textContent = saveLabel();
}
function saveWhere() {
  const err = $("#w-err");
  const fail = (msg, el) => { err.textContent = msg; err.hidden = false; announce(msg); if (el) el.focus(); };
  if (!A.sel) return fail("Pick a store first", $("#w-list input[name=store]") || $("#w-q"));
  readOpts();
  if (A.sel === NEW) {
    const name = cleanQ(), sel = $("#w-cat");
    if (!A.newCat) { sel.setAttribute("aria-invalid", "true"); return fail(`Pick a category for ${name}`, sel); }
    return saveNew(name, A.newCat);
  }
  const m = S.merchants[A.sel]; if (m) saveNew(m.name, m.category);
}
function readOpts() {
  const d = $("#o-date"); if (!d) return;
  A.date = d.value || todayISO(); A.category = $("#o-cat").value; A.note = $("#o-note").value.trim(); A.covers = $("#o-covers").value.trim();
}

/* ---------------- Saving ---------------- */
function saveNew(name, category, extra = {}) {
  readOpts();
  const ref = doc(collection(db, "expenses"));
  const data = {
    amountCents: A.cents, payer: A.payer, merchant: name.slice(0, 80), category: A.category || category || "Other",
    date: A.date || todayISO(), split: A.split, note: (A.note || "").slice(0, 140), covers: (extra.covers || A.covers || "").slice(0, 60),
    billId: extra.billId || null, settled: false, settlementId: null,
    createdAt: Date.now(), createdBy: S.me, updatedAt: Date.now(), updatedBy: S.me
  };
  // Not awaited on purpose: Firestore applies it locally right away and syncs when it can.
  const batch = writeBatch(db);
  batch.set(ref, data);
  logEntry(batch, { action: "add", expenseId: ref.id, summary: summaryOf(data) }, `add-${ref.id}`);
  batch.commit().catch(writeFailed);
  learnStore(name, data.category);
  const bill = extra.billId && S.bills.find(b => b.id === extra.billId);
  closeScreen();
  const over = bill && bill.usualCents && A.cents > bill.usualCents * 1.2 ? fmt(bill.usualCents) : null;
  toast(savedLine(fmt(data.amountCents), data.merchant, bill ? { name: bill.name, overUsual: over } : null), [
    { label: "Undo", run: () => { const u = writeBatch(db); u.delete(ref); u.delete(doc(db, "activity", `add-${ref.id}`)); u.commit().catch(writeFailed); toast(C.removed); } },
    { label: "Edit", run: () => openEdit(Object.assign({ id: ref.id }, data)) }
  ]);
}
function learnStore(name, category) {
  setDoc(doc(db, "merchants", slug(name)), { name, category, count: increment(1), lastUsed: Date.now() }, { merge: true }).catch(() => {});
}

/* ---------------- Edit (full form, the rare path) ---------------- */
const E = {};
function openEdit(e) {
  S.layer = "edit";
  Object.assign(E, { id: e.id, payer: e.payer, split: e.split || "half", confirmDel: false, orig: Object.assign({}, e) });
  openLayer(`<div class="frame">
    <header class="top"><div class="inner" style="display:flex;align-items:center"><h1 id="layer-title">Edit expense</h1><button class="link" data-act="close">Cancel</button></div></header>
    <div class="scroll"><div class="inner">
      <label class="label" for="e-amt">Amount</label><input id="e-amt" class="input" inputmode="decimal" value="${(e.amountCents / 100).toFixed(2)}">
      <p class="err" id="e-err" hidden style="text-align:left"></p>
      <span class="label">Paid by</span>
      <div class="seg" id="e-payer">${["bre", "kyle"].map(p => `<button data-act="e-payer" data-p="${p}" aria-pressed="${E.payer === p}">${PEOPLE[p]}</button>`).join("")}</div>
      <label class="label" for="e-store">Store</label><input id="e-store" class="input" value="${esc(e.merchant)}" autocapitalize="words">
      <label class="label" for="e-cat">Category</label>
      <select id="e-cat" class="input">${CATEGORIES.map(c => `<option ${e.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <label class="label" for="e-date">Date</label><input id="e-date" class="input" type="date" value="${esc(e.date)}">
      <span class="label">Split</span>
      <div class="seg" id="e-split"><button data-act="e-split" data-v="half" aria-pressed="${E.split === "half"}">50/50</button>
        <button data-act="e-split" data-v="full" aria-pressed="${E.split === "full"}">Owed in full</button></div>
      <label class="label" for="e-note">Note</label><input id="e-note" class="input" value="${esc(e.note || "")}">
      <label class="label" for="e-covers">Covers</label><input id="e-covers" class="input" value="${esc(e.covers || "")}" placeholder="July – September">
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn danger" data-act="e-delete" id="e-del">Delete</button>
      <button class="btn primary grow2" data-act="e-save">Save changes</button></div></footer>
  </div>`);
}
function saveEdit() {
  const c = toCents($("#e-amt").value), name = $("#e-store").value.trim().replace(/\s+/g, " ");
  const err = $("#e-err");
  if (!c || c > 10000000) { err.textContent = "Enter an amount, like 24.99"; err.hidden = false; return; }
  if (!name) { err.textContent = "Add where it was from"; err.hidden = false; return; }
  const data = { amountCents: c, payer: E.payer, merchant: name.slice(0, 80), category: $("#e-cat").value, date: $("#e-date").value || todayISO(),
    split: E.split, note: $("#e-note").value.trim().slice(0, 140), covers: $("#e-covers").value.trim().slice(0, 60), updatedAt: Date.now(), updatedBy: S.me };
  const changes = EDIT_FIELDS.filter(f => (E.orig[f] ?? "") !== (data[f] ?? ""))
    .map(f => ({ field: f, from: E.orig[f] ?? "", to: data[f] ?? "" }));
  if (!changes.length) { closeScreen(); toast(C.noChanges); return; }
  const batch = writeBatch(db);
  batch.update(doc(db, "expenses", E.id), data);
  logEntry(batch, { action: "edit", expenseId: E.id, summary: summaryOf(E.orig), changes });
  batch.commit().catch(writeFailed);
  closeScreen(); toast(C.changesSaved);
}
function deleteEdit() {
  const b = $("#e-del");
  if (!E.confirmDel) { E.confirmDel = true; b.textContent = "Tap again to delete"; return; }
  const batch = writeBatch(db);
  batch.delete(doc(db, "expenses", E.id));
  logEntry(batch, { action: "delete", expenseId: E.id, summary: summaryOf(E.orig) });
  batch.commit().catch(writeFailed);
  closeScreen(); toast(C.deleted);
}

/* ---------------- Settle up ---------------- */
let settleArmed = false;
function mathHTML(t, o) {
  return `<div class="math">
    <div class="r"><span>Kyle paid, split 50/50</span><span>${fmt(t.kyleHalf)}</span></div>
    <div class="r"><span>Bre paid, split 50/50</span><span>${fmt(t.breHalf)}</span></div>
    <div class="r"><span>Half the difference</span><span>${fmt(Math.abs(t.diffHalf))} to ${t.diffHalf >= 0 ? "Kyle" : "Bre"}</span></div>
    ${t.kyleFull ? `<div class="r"><span>Owed in full to Kyle</span><span>${fmt(t.kyleFull)}</span></div>` : ""}
    ${t.breFull ? `<div class="r"><span>Owed in full to Bre</span><span>${fmt(t.breFull)}</span></div>` : ""}
    <div class="r total"><span>${o.from ? esc(PEOPLE[o.from]) + " pays " + esc(PEOPLE[o.to]) : "You’re even"}</span><span>${o.amt}</span></div></div>`;
}
function openSettle() {
  S.layer = "settle";
  settleArmed = false;
  const list = S.expenses.slice(), t = calc(list), o = owes(t.net), dates = list.map(e => e.date).sort();
  const range = dates[0] === dates[dates.length - 1] ? "on " + shortDate(dates[0]) : "from " + shortDate(dates[0]) + " to " + shortDate(dates[dates.length - 1]);
  openLayer(`<div class="frame">
    <header class="top"><div class="inner"><h1 id="layer-title">Settle up</h1></div></header>
    <div class="scroll"><div class="inner">
      <p class="muted" style="margin:0 0 14px">${list.length} expense${list.length === 1 ? "" : "s"} ${esc(range)}</p>
      ${mathHTML(t, o)}
      <p class="help" style="margin-top:14px">Marking as paid starts a fresh balance. Everything stays in History.</p>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="close">Cancel</button>
      <button class="btn primary grow2" data-act="settle-go" id="s-go">${t.net ? "Mark as paid" : "Close this period"}</button></div></footer>
  </div>`);
}
function settleGo() {
  const list = S.expenses.slice(), t = calc(list), o = owes(t.net);
  if (!settleArmed) { settleArmed = true; $("#s-go").textContent = t.net ? `Confirm ${PEOPLE[o.from]} paid ${o.amt}` : "Confirm"; return; }
  const dates = list.map(e => e.date).sort();
  const sref = doc(collection(db, "settlements"));
  const rec = { date: todayISO(), createdAt: Date.now(), by: S.me, from: o.from || null, to: o.to || null, amountCents: Math.abs(t.net),
    kyleHalf: t.kyleHalf, breHalf: t.breHalf, kyleFull: t.kyleFull, breFull: t.breFull, count: list.length,
    periodStart: dates[0], periodEnd: dates[dates.length - 1] };
  // One atomic batch (Firestore allows 500 writes per batch; chunk just in case).
  const ops = [b => b.set(sref, rec),
    b => logEntry(b, { action: "settle", settlementId: sref.id, summary: { amountCents: rec.amountCents, from: rec.from, to: rec.to } }),
    ...list.map(e => b => b.update(doc(db, "expenses", e.id), { settled: true, settlementId: sref.id }))];
  for (let i = 0; i < ops.length; i += 450) { const b = writeBatch(db); ops.slice(i, i + 450).forEach(f => f(b)); b.commit().catch(writeFailed); }
  closeScreen(); toast(C.settled);
}

/* ---------------- History detail ---------------- */
async function openDetail(id) {
  S.layer = "detail";
  const s = S.settlements.find(x => x.id === id); if (!s) return;
  const o = s.amountCents ? { from: s.from, to: s.to, amt: fmt(s.amountCents) } : { amt: fmt(0) };
  const t = Object.assign({}, s, { diffHalf: Math.round((s.kyleHalf - s.breHalf) / 2) });
  openLayer(`<div class="frame">
    <header class="top"><div class="inner"><h1 id="layer-title">Settled ${esc(longDate(s.date))}</h1></div></header>
    <div class="scroll"><div class="inner">${mathHTML(t, o)}<div id="d-list"><p class="muted">Loading expenses…</p></div></div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="close">Back</button></div></footer></div>`);
  try {
    const snap = await getDocs(query(collection(db, "expenses"), where("settlementId", "==", id)));
    const list = sortExp(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
    const box = $("#d-list"); if (!box) return;
    box.innerHTML = list.length ? `<div class="rows" style="margin-top:16px">${list.map(e => rowHTML(e, false)).join("")}</div>` : `<p class="muted">No expenses found.</p>`;
  } catch (e) { const box = $("#d-list"); if (box) box.innerHTML = `<p class="err" style="text-align:left">Couldn’t load these expenses. Reopen when you’re online.</p>`; }
}

/* ---------------- Events ---------------- */
document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act;
  switch (a) {
    case "add": startAdd(); break;
    case "close": closeScreen(); break;
    case "key": pressKey(el.dataset.k); break;
    case "bill": { const b = S.bills.find(x => x.id === el.dataset.id); if (!b) break;
      A.bill = b; A.payer = b.payer || "kyle"; A.buf = (b.usualCents / 100).toFixed(2); renderAmount(); break; }
    case "clear-bill": A.bill = null; A.buf = ""; A.payer = S.me; renderAmount(); break;
    case "next": amountNext(); break;
    case "back-amount": readOpts(); A.step = "amount"; renderAmount(); break;
    case "save-where": saveWhere(); break;
    case "toggle-opts": readOpts(); A.showOpts = !A.showOpts; $("#w-opts").hidden = !A.showOpts;
      el.setAttribute("aria-expanded", A.showOpts); el.lastElementChild.textContent = A.showOpts ? "▴" : "▾"; $("#w-sum").textContent = optsSummary(); break;
    case "edit": { const e = S.expenses.find(x => x.id === el.dataset.id); if (e) openEdit(e); break; }
    case "e-payer": E.payer = el.dataset.p; document.querySelectorAll("#e-payer button").forEach(b => b.setAttribute("aria-pressed", b.dataset.p === E.payer)); break;
    case "e-split": E.split = el.dataset.v; document.querySelectorAll("#e-split button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === E.split)); break;
    case "e-save": saveEdit(); break;
    case "e-delete": deleteEdit(); break;
    case "settle": openSettle(); break;
    case "settle-go": settleGo(); break;
    case "history": S.view = "history"; render(); break;
    case "home": S.view = "home"; render(); break;
    case "detail": openDetail(el.dataset.id); break;
    case "hide-install": store("hideInstall", "1"); render(); break;
    case "signout": signOut(auth); break;
    case "reset-pass": if (S.user) sendPasswordResetEmail(auth, S.user.email).then(() => toast(C.resetSent)).catch(() => toast(C.resetFailed)); break;
    case "forgot": { const em = ($("#l-email") || {}).value; const err = $("#l-err");
      if (!em) { err.textContent = "Enter your email first, then tap Forgot password."; err.hidden = false; break; }
      sendPasswordResetEmail(auth, em.trim()).then(() => toast("If that account exists, a reset email is on its way")).catch(() => toast("Couldn’t send the email. Try again.")); break; }
  }
});
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.name === "payer") A.payer = t.value;
  if (t.name === "store") { A.sel = t.value; $("#w-err").hidden = true; if (A.sel === NEW) { A.newCat = A.newCat || A.category || ""; renderStoreList(); } else $("#w-save").textContent = saveLabel(); }
  if (t.id === "w-cat") { A.newCat = t.value; t.removeAttribute("aria-invalid"); $("#w-err").hidden = true; }
  if (t.name === "o-split") { A.split = t.value; $("#o-split-help").textContent = splitHelp(); $("#w-sum").textContent = optsSummary(); }
});
document.addEventListener("input", ev => {
  if (ev.target.id === "w-q") { A.q = ev.target.value; renderStoreList(); }
  if (["o-date", "o-cat", "o-note", "o-covers"].includes(ev.target.id)) { readOpts(); const s = $("#w-sum"); if (s) s.textContent = optsSummary(); }
});
document.addEventListener("keydown", ev => {
  if (A.step === "amount" && !$("#layer").hidden) {
    if (/^[0-9.]$/.test(ev.key)) { pressKey(ev.key); ev.preventDefault(); }
    else if (ev.key === "Backspace") { pressKey("back"); ev.preventDefault(); }
    else if (ev.key === "Enter") { amountNext(); ev.preventDefault(); }
  }
  if (ev.key === "Escape" && !$("#layer").hidden) closeScreen();
  if (ev.key === "Enter" && ev.target.id === "w-q") { ev.preventDefault();
    const q = cleanQ(); if (!q) return;
    const exact = storeList(q).find(m => m.name.toLowerCase() === q.toLowerCase()), want = exact ? exact.id : NEW;
    if (A.sel === want && (want !== NEW || A.newCat)) { saveWhere(); return; }
    A.sel = want; if (want === NEW) A.newCat = A.newCat || A.category || "";
    renderStoreList(); if (want === NEW) { const s = $("#w-cat"); if (s) s.focus(); } }
});
document.addEventListener("submit", async ev => {
  if (ev.target.id !== "login-form") return;
  ev.preventDefault();
  const em = $("#l-email").value.trim(), pw = $("#l-pass").value, err = $("#l-err"), btn = $("#l-btn");
  if (!em || !pw) { err.textContent = "Enter your email and password."; err.hidden = false; return; }
  btn.disabled = true; btn.textContent = "Signing in…"; err.hidden = true;
  try { await signInWithEmailAndPassword(auth, em, pw); }
  catch (e) {
    err.textContent = e && e.code === "auth/too-many-requests" ? "Too many attempts. Wait a few minutes and try again."
      : e && e.code === "auth/network-request-failed" ? "No connection. Connect to the internet to sign in."
      : "That email and password don’t match.";
    err.hidden = false; btn.disabled = false; btn.textContent = "Sign in";
  }
});
window.addEventListener("online", () => { S.online = true; updateSync(); });
window.addEventListener("offline", () => { S.online = false; updateSync(); });
function updateSync() { const el = $("#sync"); if (el) el.textContent = syncLabel(); }

/* ---------------- Data ---------------- */
async function seedIfEmpty() {
  try {
    const flag = await getDoc(doc(db, "config", "seed"));
    if (flag.exists()) return;
    const b = writeBatch(db);
    SEED_BILLS.forEach(([id, name, cents, category, order]) => b.set(doc(db, "bills", id), { name, usualCents: cents, category, order, payer: "kyle", active: true }));
    SEED_STORES.forEach(([name, category, count]) => b.set(doc(db, "merchants", slug(name)), { name, category, count }, { merge: true }));
    b.set(doc(db, "config", "seed"), { at: Date.now(), by: S.me });
    await b.commit();
  } catch (e) { console.warn("Seed skipped", e); }
}
function subscribe() {
  S.unsubs.forEach(u => u()); S.unsubs = [];
  const err = e => { console.error(e); if (e.code === "permission-denied") toast(C.cantRead); };
  S.unsubs.push(onSnapshot(query(collection(db, "expenses"), where("settled", "==", false)), { includeMetadataChanges: true }, snap => {
    S.expenses = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    S.pending = snap.metadata.hasPendingWrites; S.loaded = true;
    if (S.view === "home") render(); else updateSync();
  }, err));
  S.unsubs.push(onSnapshot(collection(db, "merchants"), snap => {
    const m = {}; snap.docs.forEach(d => { m[d.id] = d.data(); }); S.merchants = m;
    if (A.step === "where") renderStoreList();
  }, err));
  S.unsubs.push(onSnapshot(collection(db, "bills"), snap => { S.bills = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); }, err));
  S.unsubs.push(onSnapshot(query(collection(db, "settlements"), orderBy("createdAt", "desc"), limit(200)), snap => {
    S.settlements = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    if ($("#layer").hidden) render();
  }, err));
}

onAuthStateChanged(auth, async user => {
  S.unsubs.forEach(u => u()); S.unsubs = [];
  S.user = user; resetLayer(); hideToast(); S.layer = null; A.step = null;
  if (!user) { S.view = "login"; S.me = null; render(); return; }
  S.me = PEOPLE_BY_EMAIL_HASH[await sha256(String(user.email || "").trim().toLowerCase())] || null;
  if (!S.me) { S.view = "denied"; render(); return; }
  S.view = "home"; S.loaded = false; render();
  subscribe(); seedIfEmpty();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
