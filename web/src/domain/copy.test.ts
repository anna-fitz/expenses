import { describe, expect, it } from "vitest";
import { C, activityLine, addNewStore, balanceLine, emptyBody, greeting, nudgeLine, optsSummary, privacySections, savedLine, settleLine, settleSub, settledTitle, SIGNIN_NOTE, splitHelp, storeSub, atLine, categoryDefault, dateLabel, splitLine, storeSelected, todayISO, isABill } from "./copy.js";

const N = { p1: "Alex", p2: "Sam" };
describe("copy", () => {
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
});
