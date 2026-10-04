import { describe, expect, it } from "vitest";
import { activityLine, balanceLine, emptyBody, greeting, nudgeLine, privacySections, savedLine, SIGNIN_NOTE } from "./copy.js";

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
});
