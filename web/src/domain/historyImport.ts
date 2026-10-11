import type { HistoryDoc, HistoryMonth } from "./insights";
import { monthOf, shiftMonth } from "./insights";
import { serialToISO, type Sheet } from "./xlsx";

// Turns the old settle-up spreadsheet (one tab per settle-up, a "place / date / amount" list per person, a SUM under each)
// into the pre-app monthly summary Insights reads from config/history. Only totals are kept: no stores, notes or payers.
// `fuelTab`: the tab lists the gas bill by month ("Gas (July)"), so a plain "Gas" there is fuel. Elsewhere plain "Gas" is the bill.
export type Item = { name: string; date: string; cents: number; fuelTab: boolean };
export type Sorted = { kind: "bill"; billId: string } | { kind: "spend"; category: string; oneOff: boolean } | { kind: "skip" };

const shift = (c: string, n: number) => String.fromCharCode(c.charCodeAt(0) + n);   // single-letter columns are all the sheet uses
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;

// Every amount a tab's totals add up: each SUM(X2:X40) names an amount column, with the place two columns left and the date one left.
// Tabs were copied forward, so a stray older total can widen a range; empty rows inside it are skipped.
export function itemsOf(sheet: Sheet): Item[] {
  const ranges: Record<string, [number, number]> = {};
  for (const c of Object.values(sheet.cells)) {
    const m = c.f?.match(/^SUM\(([A-Z])(\d+):\1(\d+)\)$/i);
    if (!m) continue;
    const [lo, hi] = ranges[m[1]] || [Infinity, 0];
    ranges[m[1]] = [Math.min(lo, +m[2]), Math.max(hi, +m[3])];
  }
  const raw: Omit<Item, "fuelTab">[] = [];
  for (const [amt, [lo, hi]] of Object.entries(ranges)) {
    for (let r = lo; r <= hi; r++) {
      // Two early tabs have no date column on one side: there the place sits right next to the amount.
      const left = (k: number) => (sheet.cells[shift(amt, -k) + r]?.v || "").trim(), next = left(1);
      const [name, d] = next && !/^\d+(\.\d+)?$|^\d{1,2}\//.test(next) ? [next, ""] : [left(2), next];
      const cell = sheet.cells[amt + r], cents = Math.round(parseFloat(cell?.v ?? "") * 100);
      if (/[A-Z]+\d+/i.test(cell?.f || "")) continue;   // a total or a half worked out from other cells, not an expense
      if (!name || !Number.isFinite(cents) || cents === 0 || /^(place|total)$/i.test(name)) continue;
      raw.push({ name, date: /^\d+(\.\d+)?$/.test(d) ? serialToISO(+d) : d, cents });
    }
  }
  // Text dates ("7/14 - 9/28") use the month typed, in the tab's year. Missing dates and typos (a 2016 date in a 2020 tab) use the tab's middle date.
  const known = raw.map((x) => x.date).filter((d) => ISO.test(d)).sort(), mid = known[Math.floor(known.length / 2)] || "";
  const fuelTab = raw.some((x) => /^gas \(/i.test(x.name));
  return raw.map((x) => {
    let date = x.date;
    if (!ISO.test(date)) {
      const md = date.match(/^(\d{1,2})\/(\d{1,2})/);
      date = md && mid ? `${mid.slice(0, 4)}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}` : mid;
    }
    if (mid && days(date, mid) > 180) date = mid;
    return { ...x, date, fuelTab };
  }).filter((x) => x.date);
}

type Rule = [RegExp, Sorted];
const bill = (billId: string): Sorted => ({ kind: "bill", billId });
const cat = (category: string, oneOff = false): Sorted => ({ kind: "spend", category, oneOff });
const MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
// First match wins, so specific phrases come before the stores they mention ("costco food bar" before "costco").
const RULES: Rule[] = [
  [/for records only/, { kind: "skip" }],
  // Bills: the app's bill ids, plus the housing costs that used to be split.
  [/\b(electric|electricity|edison|solar)\b/, bill("electricity")],
  [/\b(internet|cox|spectrum|gigabitnow)\b/, bill("internet")],
  [new RegExp(`^${MON} gas$|^gas (\\(${MON}|payment|bill)|so ?cal gas|condo gas`), bill("gas-bill")],
  [/^water\b|water bill/, bill("water")],
  [/^pool( service| cleaning| clean| guy| maintenance| & filter| \(|$)/, bill("pool-service")],
  [/garden(er|ers|ing)?( |$|\()|garden service/, bill("gardener")],
  [/mortgage/, bill("mortgage")],
  [/\bhoa\b|\bdues\b/, bill("hoa")],
  [/\brent\b/, bill("rent")],
  [/property tax/, bill("property-tax")],
  // Big one-time purchases and projects (one-offs from $50 up).
  [/costco membership|sheets\/pillows|fence|repair|install|re-paint|moving truck|gas for moving|living spaces|crate & barrel|coffee table|console table|side table|barstool|patio set|patio umbrella|outdoor front bench|display case|dishwasher( \(|$)|dryer that|rice cooker|water boiler|tower fan|space heater|wyze|air purifier for|steam cleaner|coffee grinder|new vacuum|pet vacuum|window tint|privacy film|retractable gate|curtains|^ikea/, cat("Home & household", true)],
  [/camera|photo printer|bread maker|bday|birthday|present|gift|wedding|anniversary|annv|perfume|nordstrom/, cat("Gifts & occasions")],
  [/airbnb|ticket|passes|\bpass\b|disney|ren faire|medieval|oktoberfest|festival|telescope|tour\b|expo|starlux|vegas|i spa|hangar 18|camp\b|merch|dnd|d&d|heroforge|forgeworld|filament|packtalk|ninja registration|markets for makers|thrift/, cat("Travel & fun")],
  [/parking|\buber\b(?! eats)|cargo liner|fuel/, cat("Car & fuel")],
  // Pets before the stores that sell pet things ("amazon (dog toys)").
  [/\bdogs?\b|doggo|\bcat\b|litter|chewy|petsmart|petco|milo|yak chews|dental treats|dentastix|greenies|minties|breath|flea|muzzle|training collars|harness|boarding/, cat("Pets")],
  [/noodle|katsu|food (at|@|truck)|food bar/, cat("Dining & takeout")],
  [/^target \(.*snacks/, cat("Groceries")],
  [/vape|liquor|bevmo|total wine|beer|bourbon|eaze|bootlegger|bottle logic|bruery|brew|hangar 24|golden road|saloon|tin liz|drinks|rolling papers|(?<!food )\bbar\b(?! ?stool)|hi proof|high horse/, cat("Drinks & smoke shop")],
  [/coffee|^trade\b|trade sub|trade cof|stereoscope|cafe|7 leaves|eggspresso|fourtea|sunright|boba/, cat("Coffee")],
  [/food bar|food @|food at|food truck|doordash(?! \(groceries)|grubhub|uber eats|takeout|take out|restaurant|kitchen|cuisine|grill|bistro|noodle|ramen|thai|izakaya|taqueria|pizza|burg|sandwich|bakery|baguette|cakes|cream pan|empanadas|halal|india|curry|katsu|dumplings|poke|habit|jersey mike|lazy dog|chipotle|chick|in-?n-?out|in n out|greek|stonefire|zankou|eggbred|acai|somi ?somi|moulin|portos|\b85|parfait|scratch|burnt crumbs|red ?straw|hatam|honda ya|smoke & fire|texas de brazil|farmhouse|heroes|crash pad|cauldron|milk & cookies|hopscotch|sip and savor|jeune et jolie|two saucy broads|pour company|macallan|din ?tai|dintai|villains|tasa|seoul eats|luyu|cuzco|j's|pita|banzai|tokyo eats|inka|cuban|la rancheria|porch & swing|desserts|churro|tamales|boudin|fam's|yls|nilly|lees|pepes|fuoco|crockers|small axe|higo|naz|alex's|ruin|kentro|twisted vine|bru\b|commisary|isla|mori|j-tree|urban plates|brusters|kabob|lucille|yard house|renzo|daphne|sugar moon|pho\b|sushi|mastros/, cat("Dining & takeout")],
  [/ralphs|rlaphs|sprout|costco|cotsco|trader|aldi|h ?mart|zion|mitsuwa|tokyo central|99 ranch|albertsons|mothers market|super 1|korean market|walmart|instacart|groceries|seltzer|la ?croix|snack|granola|rice cakes|almonds|protein|bars\b|jerky|tuna|coconut water|peanut butter|cookies|yogurt|fruit|liquidiv|spices|paprika|farmer'?s market|aki home/, cat("Groceries")],
  [/target|amazon|home depot|lowes|world market|daiso|homegoods|harbor freight|best buy|lh outlet|toilet paper|\btp\b|paper towels|soap|detergent|pods|shampoo|conditioner|body ?wash|face ?wash|sponges|trash liners|kleenex|tissues|air freshener|filters?|batteries|rugs?\b|rack|tape|tray|knives|tupperware|cotton|toner|mouthwash|acne|moisturizer|sally|printer ink|router|mesh|ethernet|smoke & co|adob|firewood|armstrong|pool (heating|critter)|fruit picker|drain|cushions|covers|sofa|catchall|cookie jar|tide|insect|flyswatter|laundry|dryer|wifi|membership|\bbed\b/, cat("Home & household")],
];

// Spending this big counts as a one-off (a celebration dinner, dog boarding, Disneyland), except groceries and household runs.
const ONE_OFF_CENTS = 30000, ONE_OFF_MIN = 5000;
export function sortItem(x: Item): Sorted {
  const n = x.name.toLowerCase().replace(/\s+/g, " ");
  if (n === "gas") return x.fuelTab ? cat("Car & fuel") : bill("gas-bill");
  const hit = RULES.find(([re]) => re.test(n))?.[1] ?? cat("Other");
  if (hit.kind !== "spend") return hit;
  const oneOff = hit.oneOff ? x.cents >= ONE_OFF_MIN : x.cents >= ONE_OFF_CENTS && hit.category !== "Groceries" && hit.category !== "Home & household";
  return { ...hit, oneOff };
}

export type Preview = { history: HistoryDoc; items: number; tabs: number; oneOffs: number; skipped: number; dropped: number; other: number; first: string; through: string; totalCents: number };
// `appStart` is the date of the earliest expense already in the app: a month the app covers is never also summarized,
// so spreadsheet items from that month on are left out (`dropped`).
export function buildHistory(sheets: Sheet[], appStart: string | null): Preview {
  const items = sheets.flatMap(itemsOf), months: Record<string, HistoryMonth> = {};
  const lastSheet = items.map((x) => monthOf(x.date)).sort().pop() || "";
  const beforeApp = appStart ? shiftMonth(monthOf(appStart), -1) : lastSheet;
  const through = lastSheet < beforeApp ? lastSheet : beforeApp;
  let skipped = 0, dropped = 0, other = 0, total = 0, oneOffs = 0;
  for (const x of items) {
    const s = sortItem(x), m = monthOf(x.date);
    if (s.kind === "skip") { skipped++; continue; }
    if (m > through) { dropped++; continue; }
    const h = (months[m] ||= { cats: {}, bills: {}, oneOffs: {}, oneOffCount: 0 });
    const add = (o: Record<string, number>, k: string) => { o[k] = (o[k] || 0) + x.cents; };
    if (s.kind === "bill") add(h.bills, s.billId);
    else if (s.oneOff) { add(h.oneOffs!, s.category); h.oneOffCount!++; oneOffs++; }
    else add(h.cats, s.category);
    if (s.kind === "spend" && s.category === "Other") other++;
    total += x.cents;
  }
  const keys = Object.keys(months).sort();
  return { history: { through, months }, items: items.length, tabs: sheets.filter((s) => itemsOf(s).length).length, oneOffs, skipped, dropped, other, first: keys[0] || "", through, totalCents: total };
}
