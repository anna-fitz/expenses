// Every word the app shows, plus how money and dates are displayed. Edit the voice here.
// Voice: everyday copy is playful and Discord-leaning (emoji beside words, never instead of them).
// Security, privacy, password, and sign-in copy is plain: no emoji, no jokes. Names are always parameters.

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
  if (hour >= 5 && hour < 12) return `Morning, ${name} ☀️`;
  if (hour >= 12 && hour < 17) return `Afternoon, ${name} 👋`;
  return `Evening, ${name} 🌙`;
}
// net > 0 means member a owes member b. Names are always passed in.
export function balanceLine(net, me, a, b, names) {
  if (net === 0) return { who: "You’re even", sub: "Perfectly balanced, as all things should be ⚖️" };
  const from = net > 0 ? a : b, to = net > 0 ? b : a;
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
  if (bill) return `Logged ✅ ${amount} for ${bill.name}` + (bill.overUsual ? ` That’s more than the usual ${bill.overUsual}.` : "");
  return `Logged ✅ ${amount} at ${merchant}`;
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

export const dupLine = (who, amount, kind, name, date) => `${who} added ${amount} ${kind === "bill" ? "for" : "at"} ${name} on ${date}. Add this one too?`;

export const venmoHelp = other => `The part after @. ${other}’s phone uses this to pay or request from you.`;

export const settleNote = (from, to) => from === to ? `Shared expenses, ${shortDate(from)}` : `Shared expenses, ${shortDate(from)} – ${shortDate(to)}`;
export const payOnVenmo = (who, amount) => `Pay ${who} ${amount} on Venmo`;
export const requestOnVenmo = (who, amount) => `Request ${amount} from ${who} on Venmo`;
export const noVenmo = who => `${who} hasn’t added a Venmo username yet. They can add it in Profile.`;

export const fmtWhole = c => "$" + (c / 100).toLocaleString("en-US");
export function nudgeLine(days, limit, settledBefore) {
  if (days != null && limit) return `It’s been ${days} days and the balance is over ${limit}.`;
  if (days != null) return `It’s been ${days} days since ${settledBefore ? "you settled up" : "your first expense"}.`;
  return `The balance is over ${limit}.`;
}

export const emptyBody = other => `Add the first expense and it pops up on ${other}’s phone instantly.`;

/* ---------- Add and edit ---------- */
export const billFor = name => `For ${name}`;
export const addNewStore = q => `Add ${q} as a new store`;
export const categoryFor = name => `Category for ${name}`;
export const pickCategoryFor = name => `Pick a category for ${name}`;
export const optsSummary = (dateLabel, split, category) =>
  [dateLabel, split === "full" ? "owed in full" : "split 50/50", category || "usual category"].join(" · ");
export const splitHelp = (other, split, cents) =>
  split === "full" ? `${other} pays back the whole ${fmt(cents)}.` : `${other} owes ${fmt(Math.round(cents / 2))}.`;
export const storeSub = (category, alsoCalled) => [category, alsoCalled ? `also called ${alsoCalled}` : ""].filter(Boolean).join(" · ");

/* ---------- Add flow: store, review, and category list ---------- */
export const storeSelected = name => `${name} selected`;
export const isABill = name => `${name} is a bill.`;
export const categoryDefault = (category, store) => `${category} (default for ${store})`;
export const atLine = (name, isBill) => `${isBill ? "for" : "at"} ${name}`;
export const splitLine = (other, split, cents) => split === "full" ? "Owed in full" : `50/50, ${other} owes ${fmt(Math.round(cents / 2))}`;
export const dateLabel = d => d === todayISO() ? "Today" : shortDate(d);

/* ---------- History ---------- */
export const settleLine = (s, names) => s.amountCents ? `${names[s.from]} paid ${names[s.to]} ${fmt(s.amountCents)}` : "Closed even";
export const settleSub = s => `${longDate(s.date)}, ${s.count} expense${s.count === 1 ? "" : "s"}${s.method === "venmo" ? ", via Venmo" : ""}`;
export const settledTitle = date => `Settled ${longDate(date)}`;
export const halfPaid = name => `${name} paid, split 50/50`;
export const halfDiff = (amount, name) => `${amount} to ${name}`;
export const fullTo = name => `Owed in full to ${name}`;
export const pays = (from, to) => `${from} pays ${to}`;

/* ---------- Security and privacy: plain voice, no emoji ---------- */
export const SIGNIN_NOTE = "Only the two people this app is for can sign in. Passwords are stored scrambled. Nobody can read them.";
export const pwNote = them => `Saved by Firebase in scrambled form. Nobody can read it, including ${them}.`;
export function privacySections(them) {
  return [
    { id: "where", title: "Where your data lives", body: [
      "Your shared expenses, history, stores, bills, settings, and profiles are stored in Google Firebase, in Google’s United States data centers (multi-region “nam5”).",
      "Google encrypts the data while it’s sent and while it’s stored."] },
    { id: "who", title: "Who can see it", body: [
      `Only two accounts can open this data: yours and ${them}’s. Everything in the app is shared between you two, including each other’s Venmo username.`,
      "New sign-ups are turned off, so no one else can create an account.",
      `You and ${them} are both admins of the Firebase project. Either of you can view or change the data, and see both email addresses, in the Firebase console.`,
      "Google runs the servers, under Google Cloud’s terms."] },
    { id: "never", title: "What nobody can see", body: [
      "Your password. Firebase stores it scrambled (hashed), so no one can read it, including either admin.",
      "Bank or card details. The app never asks for them.",
      "Your Venmo account. The app only opens Venmo with an amount filled in. It can’t see your account or whether a payment went through."] },
    { id: "phone", title: "What’s on this phone", body: [
      "A copy of the shared data, so the app works offline. Only this app can read it.",
      "Signing out erases it from this phone.",
      "A few preferences: your theme, and a short-lived note about a Venmo payment in progress."] },
    { id: "code", title: "The code", body: [
      "The app’s code is public on GitHub, so anyone can review it. It contains no names, emails, or other personal details.",
      "The Firebase key in the code is meant to be public. It only identifies the project, and it’s limited to this website."] },
    { id: "log", title: "The activity log", body: [
      "Every change is recorded with who made it and when. Entries can’t be edited or deleted, except an immediate Undo."] },
  ];
}
export const privacySummary = them => [
  "Your data is stored in Google Firebase, in the United States, and encrypted.",
  `Only your account and ${them}’s can open it. New sign-ups are off.`,
  `You and ${them} are both admins: either of you can see the data in the Firebase console.`,
  "Nobody can read your password, including either admin.",
  "Signing out erases the app’s data from this phone.",
];

/* ---------- Fixed strings ---------- */
export const C = {
  loginHelp: "Sign in with your email and password.", email: "Email", password: "Password",
  signIn: "Sign in", signingIn: "Signing in…", forgot: "Forgot password?",
  loginEmpty: "Enter your email and password.", loginMismatch: "That email and password don’t match.",
  loginMany: "Too many attempts. Wait a few minutes and try again.", loginOffline: "No connection. Connect to the internet to sign in.",
  forgotNeedEmail: "Enter your email first, then tap Forgot password.", resetMaybe: "If that account exists, a reset email is on its way.",
  deniedTitle: "Not set up for this app", deniedBody: "This account can sign in, but it isn’t set up for this app.",
  signOut: "Sign out", signOutNote: "Signing out erases this app’s data from this phone.",
  tabHome: "Home", tabHistory: "History", tabInsights: "Insights", tabSettings: "Settings",
  soonTitle: "Coming soon 🚧", soonBody: "This part of the app is being rebuilt.",
  privacyTitle: "Privacy & security",
  obPrivacyTitle: "How your data is protected", obMore: "Read the full details", obContinue: "Continue",
  pwTitle: "Set your own password", pwHelp: "Choose a password only you know. Use at least 12 characters.",
  pwNew: "New password", pwConfirm: "Type it again", pwShow: "Show passwords", pwSave: "Save password", pwSkip: "I’ve already set my own",
  pwShort: "Use at least 12 characters.", pwMismatch: "The two passwords don’t match.",
  pwCurrent: "Current password", pwNeedCurrent: "For your security, enter your current password to continue.",
  pwWrongCurrent: "That current password isn’t right.", pwSaved: "Password saved.", pwFailed: "Couldn’t save the password. Try again.",
  appName: "Expenses",
  add: "Add expense",
  next: "Next", log: "Log expense", reviewTitle: "Look good?", pickBill: "Pick a bill", clear: "Clear", done: "Done", storeDefault: "Store’s default",
  billsHelp: "Bills are your recurring shared costs, kept separate from everyday expenses. Each one fills in its usual amount. Change it on the keypad if this month’s is different.",
  logWithBill: "Log it with Pick a bill", addANote: "Add a note",
  amount: "Amount",
  bills: "Bills", change: "Change", cancel: "Cancel", back: "Back", enterAmount: "Enter an amount",
  deleteDigit: "Delete last digit", decimal: "Decimal point", paidBy: "Paid by", you: "You", youLower: "you", someone: "Someone",
  whereTitle: "Where was it?", store: "Store", storeSearch: "Search, or type a new one", chooseStore: "Choose a store",
  pickStore: "Pick a store first", typeToAdd: "Type a store name to add it.", chooseCategory: "Choose a category",
  editAmount: "Edit amount", details: "Details", date: "Date", split: "Split",
  splitHalf: "50/50", splitFull: "Owed in full", category: "Category", note: "Note", notePh: "What was it? e.g., dog food", covers: "Covers",
  coversPh: "July – September", coversHelp: "For bills that pay for more than one month.",
  dupTitle: "Looks like a repeat 🔁", dupCancel: "Don’t add", dupOk: "Log anyway", undo: "Undo", edit: "Edit", dismiss: "Dismiss",
  editTitle: "Edit expense", saveChanges: "Save changes", del: "Delete", delConfirm: "Tap again to delete",
  amountLike: "Enter an amount, like 24.99", needStore: "Add where it was from",
  editGone: "That expense isn’t here anymore. It was deleted or settled on the other phone.",
  settleUps: "Settle-ups", activityTab: "Activity", noSettles: "No settle-ups yet 🧾",
  noSettlesBody: "When you mark a balance as paid, it’s saved here with every expense it covered.",
  showMore: "Show more", activityNote: "Shared by both of you. Entries can’t be edited or deleted.",
  detailFailed: "Couldn’t load these expenses. Reopen when you’re online.", noExpensesFound: "No expenses found.",
  halfDifference: "Half the difference", even: "You’re even",
  emptyTitle: "It’s quiet… too quiet 👀",
  removed: "Removed.",
  changesSaved: "Changes saved.",
  noChanges: "Nothing changed.",
  reminderTitle: "Settle-up reminder", nudgeTitle: "Settle-up o’clock ⏰", reminderHelp: "This applies to both of you.", reminderSaved: "Reminder saved.", remindAfter: "Remind us after", remindOver: "Or when the balance is over",
  venmoChanged: "The balance changed. Check it and try again.", alreadySettled: "Already settled up.",
  venmoAskPay: "Did the Venmo payment go through?", venmoAskRequest: "Did the Venmo request get paid?", venmoYes: "Yes, mark as paid", venmoNo: "Not yet",
  venmoInvalid: "Use 5–30 letters, numbers, dashes, or underscores", venmoSaved: "Venmo username saved.", venmoRemoved: "Venmo username removed.",
  checking: "Checking…",
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
  settled: "Settled! Fresh slate ✨",
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
