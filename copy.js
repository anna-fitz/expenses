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

/* ---------- Fixed strings ---------- */
export const C = {
  appName: "Shared expenses",
  emptyTitle: "Nothing yet",
  emptyBody: "Add the first shared expense. It shows up on both phones right away.",
  removed: "Removed.",
  changesSaved: "Changes saved.",
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
