// Every word the app shows, plus how money and dates are displayed. Edit the voice here.
// Voice: warm and plain. Sentence case. No jokes. Errors say what happened and what to do.

/* ---------- Formatting ---------- */
export const fmt = c => (c < 0 ? "-" : "") + "$" + (Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = n => String(n).padStart(2, "0");
export const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const todayISO = () => iso(new Date());
export const parseISO = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const daysBetween = (a, b) => Math.max(0, Math.round((parseISO(b) - parseISO(a)) / 86400000));
export const shortDate = s => parseISO(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const longDate = s => parseISO(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const timeOf = ms => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export function dayLabel(s) {
  if (s === todayISO()) return "Today";
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (s === iso(y)) return "Yesterday";
  const d = parseISO(s);
  return d.toLocaleDateString("en-US", d.getFullYear() === new Date().getFullYear()
    ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/* ---------- Home ---------- */
export function greeting(name, hour) {
  const part = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${name}`;
}
// net > 0 means Bre owes Kyle.
export function balanceLine(net, me, names) {
  if (net === 0) return { who: "You’re even", sub: "All square." };
  const from = net > 0 ? "bre" : "kyle", to = net > 0 ? "kyle" : "bre";
  return from === me ? { who: `You owe ${names[to]}`, sub: "" } : { who: `${names[from]} owes you`, sub: "" };
}
export function sinceLine(count, lastISO, daysAgo) {
  if (!count) return lastISO ? `Last settled on ${shortDate(lastISO)}` : "No expenses yet";
  const n = `${count} expense${count === 1 ? "" : "s"}`;
  if (!lastISO) return `${n} so far`;
  const ago = daysAgo === 0 ? "today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;
  return `${n} since you settled on ${shortDate(lastISO)}, ${ago}`;
}
export function savedLine(amount, merchant, bill) {
  if (bill) return `Got it. ${amount} for ${bill.name}.` + (bill.overUsual ? ` That’s more than the usual ${bill.overUsual}.` : "");
  return `Got it. ${amount} at ${merchant}.`;
}

/* ---------- Activity log ---------- */
const FIELD_NAMES = { amountCents: "amount", payer: "paid by", merchant: "store", category: "category", date: "date", split: "split", note: "note", covers: "covers" };
function showVal(field, v, names) {
  if (field === "usualCents") return fmt(v);
  if (v === "" || v == null) return "none";
  if (field === "amountCents") return fmt(v);
  if (field === "payer") return names[v] || v;
  if (field === "split") return v === "full" ? "owed in full" : "50/50";
  if (field === "date") return shortDate(v);
  return String(v);
}
const BILL_FIELD_NAMES = { name: "name", usualCents: "usual amount", category: "category", payer: "usually paid by" };
function changeList(changes, fieldNames, names) {
  const ch = (changes || []).map(c => `${fieldNames[c.field] || c.field} ${showVal(c.field, c.from, names)} → ${showVal(c.field, c.to, names)}`);
  return ch.slice(0, 3).join(", ") + (ch.length > 3 ? `, and ${ch.length - 3} more` : "");
}

export function activityLine(a, names, canon = n => n) {
  const who = names[a.by] || "Someone", s = a.summary || {};
  switch (a.action) {
    case "add": return `${who} added ${fmt(s.amountCents)} at ${canon(s.merchant)}`;
    case "delete": return `${who} deleted ${fmt(s.amountCents)} at ${canon(s.merchant)}`;
    case "edit": return `${who} changed ${canon(s.merchant)}: ${changeList(a.changes, FIELD_NAMES, names)}`;
    case "settle": return s.amountCents ? `${who} settled up: ${names[s.from]} paid ${names[s.to]} ${fmt(s.amountCents)}` : `${who} closed an even period`;
    case "store": {
      const n = s.name, c = (a.changes || [])[0] || {};
      if (a.kind === "rename") return `${who} renamed ${n} to ${s.to}`;
      if (a.kind === "merge") return `${who} merged ${n} into ${s.to}`;
      if (a.kind === "category") return `${who} changed ${n}’s usual category: ${c.from} → ${c.to}`;
      if (a.kind === "remove") return `${who} removed the store ${n}`;
      if (a.kind === "restore") return `${who} brought back the store ${n}`;
      break;
    }
    case "bill": {
      if (a.kind === "add") return `${who} added the bill ${s.name}, usually ${fmt(s.amountCents)}`;
      if (a.kind === "edit") return `${who} changed ${s.name}: ${changeList(a.changes, BILL_FIELD_NAMES, names)}`;
      if (a.kind === "retire") return `${who} retired the bill ${s.name}`;
      if (a.kind === "restore") return `${who} brought back the bill ${s.name}`;
      break;
    }
  }
  return `${who} made a change`;
}

export const storeExists = name => `There’s already a store called ${name}.`;
export const mergeHelp = name => `Past expenses at ${name} will show and count under the store you pick.`;

export const billExists = name => `There’s already a bill called ${name}`;

/* ---------- Fixed strings ---------- */
export const C = {
  appName: "Shared expenses",
  emptyTitle: "Nothing yet",
  emptyBody: "Add the first shared expense. It shows up on both phones right away.",
  removed: "Removed.",
  changesSaved: "Changes saved.",
  noChanges: "Nothing changed.",
  billSaved: "Bill saved.", billRetired: "Bill retired.", billBack: "Bill is back.", enterBillAmount: "Enter an amount, like 64.50", noBills: "No active bills.",
  storeRenamed: "Store renamed.", storesMerged: "Stores merged.", storeRemoved: "Store removed.", storeBack: "Store is back.",
  categorySaved: "Category saved.", enterName: "Enter a name", pickMerge: "Pick a store to merge into", noStores: "No stores match.",
  removeHelp: "It disappears from the store picker. Past expenses keep their name, and you can bring it back from the Stores list.",
  emptyActivity: "Changes to expenses will show up here.",
  activityError: "Couldn’t load activity. Check the security rules in Firebase.",
  statsHeading: "This period",
  statsEmpty: "Stats show up once you add expenses.",
  statDaysSettle: "Days since you settled up",
  statDaysFirst: "Days since your first expense",
  statTotal: "Shared spending",
  statTop: "Top store",
  statBig: "Biggest expense",
  deleted: "Expense deleted.",
  settled: "Settled. Fresh start.",
  offline: "Offline, changes will sync",
  syncing: "Syncing…",
  cantChange: "This account can’t make changes. Check the security rules in Firebase.",
  cantSave: "Couldn’t save that change. Try again.",
  cantRead: "This account can’t read the data. Check the security rules in Firebase.",
  resetSent: "Password reset email sent.",
  resetFailed: "Couldn’t send the email. Try again.",
};

/* ---------- Profile ---------- */
export const COLOR_NAMES = { plum: "Plum", green: "Green", blue: "Blue", teal: "Teal", coral: "Coral", amber: "Amber", rose: "Rose", slate: "Slate" };
export const EMOJI_NAMES = { "🌻": "Sunflower", "🌵": "Cactus", "🍋": "Lemon", "🍑": "Peach", "🐶": "Dog", "🐱": "Cat", "🦊": "Fox", "🐻": "Bear",
  "🐼": "Panda", "🐸": "Frog", "🐙": "Octopus", "☕": "Coffee", "🌙": "Moon", "⭐": "Star", "🎧": "Headphones", "🚲": "Bike" };
export const colorMoved = (partner, colorName) => `${partner} picked this color too, so yours shows as ${colorName} for now.`;
