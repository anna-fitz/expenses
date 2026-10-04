import { describe, expect, it } from "vitest";
import { C, activityLine, addNewStore, balanceLine, emptyBody, greeting, nudgeLine, optsSummary, privacySections, savedLine, settleLine, settleSub, settledTitle, SIGNIN_NOTE, splitHelp, storeSub, atLine, categoryDefault, dateLabel, splitLine, storeSelected, todayISO, isABill, settleHero, periodLine, payVenmo, requestVenmo, confirmTitle, confirmBody, COLOR_NAMES, billsCount, daysOpt, reminderSummary, storesCount, theirColor, tooClose, venmoPrivacy } from "./copy.js";

const N = { p1: "Alex", p2: "Sam" };
describe("copy", () => {
  it("words Profile and Settings", () => {
    expect([storesCount(17), storesCount(1), billsCount(6), billsCount(1)]).toEqual(["17 stores", "1 store", "6 bills", "1 bill"]);
    expect([reminderSummary(60, 50000), reminderSummary(60, 0), reminderSummary(0, 100000), reminderSummary(0, 0)])
      .toEqual(["After 60 days or over $500", "After 60 days", "Over $1,000", "Off"]);
    expect([daysOpt(30), theirColor("Sam"), tooClose("Sam")]).toEqual(["30 days", "Sam’s color", "Too close to Sam’s"]);
    expect(COLOR_NAMES).toEqual({ blue: "Blue", orange: "Orange", aqua: "Aqua", magenta: "Magenta", green: "Green", violet: "Violet" });
    const v = venmoPrivacy("Sam");
    expect(v.code).toBe("venmo.com/{username}?txn=pay&amount=…&note=…");
    expect(v.before + v.code + v.after).toBe("Stored as text in your profile in Firebase, readable only by your account and Sam’s. The app uses it for one thing: "
      + "building a Venmo link, venmo.com/{username}?txn=pay&amount=…&note=…, that opens Venmo with the payment filled in. "
      + "It never signs in to Venmo, and it can’t see your Venmo account, balance, or payments.");
    expect(/\p{Extended_Pictographic}/u.test(v.before + v.after + C.emailNote)).toBe(false);
  });
  it("explains the Venmo mechanism on the privacy page too", () =>
    expect(privacySections("Sam").find((s) => s.id === "never")?.body[2]).toBe(
      "Your Venmo account. The app only builds a link (venmo.com/{username}?txn=pay&amount=…) that opens Venmo with the payment filled in. "
      + "It never signs in to Venmo, and can’t see your account, balance, or whether a payment went through."));
  it("greets by time of day", () =>
    expect([4, 5, 12, 17].map((h) => greeting("Alex", h))).toEqual(["Evening, Alex 🌙", "Morning, Alex ☀️", "Afternoon, Alex 👋", "Evening, Alex 🌙"]));
  it("states the balance from your side, generically", () => {
    expect(balanceLine(500, "p1", "p1", "p2", N)).toEqual({ who: "You owe Sam", sub: "" });
    expect(balanceLine(500, "p2", "p1", "p2", N)).toEqual({ who: "Alex owes you", sub: "" });
    expect(balanceLine(-500, "p1", "p1", "p2", N)).toEqual({ who: "Sam owes you", sub: "" });
    expect(balanceLine(0, "p1", "p1", "p2", N).sub).toBe("Perfectly balanced, as all things should be ⚖️");
  });
  it("uses the new voice", () => {
    expect(savedLine("$45.12", "Costco", null)).toBe("Logged ✅ $45.12 at Costco");
    expect(emptyBody("Sam")).toBe("Add the first expense and it pops up on Sam’s phone instantly.");
  });
  it("keeps settle and activity sentences", () =>
    expect(activityLine({ by: "p2", action: "settle", summary: { amountCents: 69022, from: "p1", to: "p2" } }, N)).toBe("Sam settled up: Alex paid Sam $690.22"));
  it("words the reminder", () => expect(nudgeLine(61, "$500", false)).toBe("It’s been 61 days and the balance is over $500."));
  it("keeps security copy plain (no emoji)", () => {
    const text = [SIGNIN_NOTE, ...privacySections("Sam").flatMap((s) => [s.title, ...s.body])].join(" ");
    expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false);
    expect(SIGNIN_NOTE).toBe("Only the two people this app is for can sign in. Passwords are stored scrambled. Nobody can read them.");
  });
  it("covers every privacy section", () =>
    expect(privacySections("Sam").map((s) => s.id)).toEqual(["where", "who", "never", "phone", "code", "log"]));
  it("words the add flow", () => {
    expect(addNewStore("Blue Bottle")).toBe("Add Blue Bottle as a new store");
    expect(optsSummary("Today", "half", "")).toBe("Today · split 50/50 · usual category");
    expect(optsSummary("Sep 1", "full", "Coffee")).toBe("Sep 1 · owed in full · Coffee");
    expect(splitHelp("Sam", "half", 4513)).toBe("Sam owes $22.57.");
    expect(splitHelp("Sam", "full", 4513)).toBe("Sam pays back the whole $45.13.");
    expect(storeSub("Groceries", "TJs")).toBe("Groceries · also called TJs");
    expect(storeSub("", null)).toBe("");
  });
  it("words settle-ups", () => {
    expect(settleLine({ amountCents: 37744, from: "p1", to: "p2" }, N)).toBe("Alex paid Sam $377.44");
    expect(settleLine({ amountCents: 0, from: null, to: null }, N)).toBe("Closed even");
    expect(settleSub({ date: "2026-09-30", count: 2, method: "venmo" })).toBe("Sep 30, 2026, 2 expenses, via Venmo");
    expect(settleSub({ date: "2026-08-31", count: 1 })).toBe("Aug 31, 2026, 1 expense");
    expect(settledTitle("2026-09-30")).toBe("Settled Sep 30, 2026");
  });
  it("keeps the activity note and edit-gone message plain", () => {
    expect([C.activityNote, C.editGone].every((t) => typeof t === "string" && t.length > 0)).toBe(true);
    expect(/\p{Extended_Pictographic}/u.test(C.activityNote + C.editGone)).toBe(false);
  });
  it("words the redesigned add flow", () => {
    expect(storeSelected("Costco")).toBe("Costco selected");
    expect(categoryDefault("Groceries", "Costco")).toBe("Groceries (default for Costco)");
    expect([atLine("Costco", false), atLine("Water", true)]).toEqual(["at Costco", "for Water"]);
    expect(splitLine("Sam", "half", 4513)).toBe("50/50, Sam owes $22.57");
    expect(splitLine("Sam", "full", 4513)).toBe("Owed in full");
    expect([dateLabel(todayISO()), dateLabel("2020-09-01")]).toEqual(["Today", "Sep 1"]);
    expect([C.next, C.log, C.reviewTitle, C.pickBill, C.clear, C.done, C.storeDefault])
      .toEqual(["Next", "Log expense", "Look good?", "Pick a bill", "Clear", "Done", "Store’s default"]);
  });
  it("explains bills, and points a typed bill name to them", () => {
    expect(C.billsHelp).toBe("Bills are your recurring shared costs, kept separate from everyday expenses. Each one fills in its usual amount. Change it on the keypad if this month’s is different.");
    expect(isABill("Water")).toBe("Water is a bill.");
    expect([C.logWithBill, C.addANote]).toEqual(["Log it with Pick a bill", "Add a note"]);
  });
  it("words settling up", () => {
    const N = { p1: "Alex", p2: "Sam" };
    expect([settleHero(500, "p1", "p1", "p2", N), settleHero(500, "p2", "p1", "p2", N), settleHero(0, "p1", "p1", "p2", N)])
      .toEqual(["You owe Sam", "Alex owes you", "You’re even ⚖️"]);
    expect([periodLine(2, "2026-09-29", "2026-09-30"), periodLine(1, "2026-09-29", "2026-09-29")]).toEqual(["2 expenses, Sep 29 – Sep 30", "1 expense, Sep 29"]);
    expect([payVenmo("Sam"), requestVenmo("Sam")]).toEqual(["Pay Sam on Venmo", "Request from Sam on Venmo"]);
    expect([confirmTitle("pay", "Sam", "$377.44"), confirmTitle("charge", "Sam", "$377.44"), confirmTitle("even", "Sam", "$0.00")])
      .toEqual(["Did you pay Sam $377.44?", "Did Sam pay you $377.44?", "Close this period?"]);
    expect([confirmBody(12), confirmBody(1)]).toEqual([
      "This starts a fresh balance. All 12 expenses move to History, where you can always see them.",
      "This starts a fresh balance. The 1 expense moves to History, where you can always see it."]);
    expect([C.settleUp, C.howWeGot, C.paidOther, C.closePeriod, C.yesClose]).toEqual(["Settle up", "How we got this", "Paid another way", "Close this period", "Yes, close it"]);
  });
});
