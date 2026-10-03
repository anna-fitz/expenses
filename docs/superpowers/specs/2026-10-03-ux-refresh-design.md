# UX refresh: profile, activity log, clearer add flow, WCAG 2.2 A

Date: 2026-10-03 · Status: draft for review

## Goal

Give the app a warm, personal feel without adding clutter, make adding an expense self-explanatory, keep a trustworthy record of every change, and meet WCAG 2.2 Level A on every screen.

**Success looks like:**
- A first-time user can add an expense without being told how. Each step says what it wants and what comes next.
- Each person sees the app from their own point of view ("You owe Kyle"), with their own emoji and color.
- Every add, edit, delete, settle-up, and undo can be looked up later.
- An automated axe scan finds no WCAG 2.0, 2.1, or 2.2 Level A violations on any screen, in light or dark mode, and a manual VoiceOver pass completes the main tasks.

**Unchanged:** money rules, the expense, settlement, bill, and merchant data, $0 running cost, Firebase Spark, GitHub Pages, no build step, Firebase SDK 12.19.0.

## Voice

Warm and plain. Friendly, calm, sentence case, no jokes or teasing. Personality comes from small moments, not decoration:

| Moment | Copy |
|---|---|
| Greeting | "Good morning, Bre" / "Good afternoon, Bre" / "Good evening, Bre" (5–12, 12–17, 17–5) |
| Even | "You're even" with the line "All square." |
| Saved | "Got it. $45.12 at Costco." |
| Saved bill over usual | "Got it. $780.00 for Electricity. That's more than the usual $645.55." |
| Undone | "Removed." |
| Settled | "Settled. Fresh start." |
| Empty list | Heading "Nothing yet" and the line "Add the first shared expense. It shows up on both phones right away." |
| Empty activity | "Changes to expenses will show up here." |

Errors keep the existing rule: say what happened and what to do.

All user-facing wording lives in `copy.js`, so the voice can be tuned without touching logic.

## Structure

| File | Responsibility |
|---|---|
| `index.html` | Shell and all CSS (as now) |
| `app.js` | Screens, state, data, events |
| `copy.js` (new) | Every user-facing string and string-building function (greetings, toasts, empty states, errors, activity sentences) |
| `ui.js` (new) | Accessibility plumbing: `openLayer`/`closeLayer` with focus management and `inert`, the `announce()` live region, the persistent toast, the document title |
| `sw.js` | Add `copy.js` and `ui.js` to `SHELL`, bump `CACHE` |

## Data

### `config/profile-{bre|kyle}` (new docs; existing `config` rule already allows)
```
emoji: string | null     // one of EMOJI; null shows the person's initial
color: string            // key of PALETTE; defaults bre → "plum", kyle → "green"
theme: "system" | "light" | "dark"   // default "system"
updatedAt: number
```
Both profiles are subscribed to, so each phone shows the partner's emoji and color. The theme only applies to the profile's owner. It's also cached in `localStorage` (`theme`) and applied before first paint to avoid a flash.

**Palette** (all pass 4.5:1 against the surface and background in their mode; checked 2026-10-03):

| Key | Light | Dark |
|---|---|---|
| plum | #8A4FA3 | #C79BDB |
| green | #2F7D5B | #7FC9A5 |
| blue | #2B63B5 | #8DB4F0 |
| teal | #1F7A80 | #79CDD2 |
| coral | #C2412D | #F29A8A |
| amber | #A35C00 | #F2B866 |
| rose | #B83A73 | #F0A1C4 |
| slate | #4F5D75 | #AEB9CC |

The partner's current color is shown as taken and can't be selected. If both somehow hold the same color (for example, by saving at the same moment offline), the person whose profile was updated most recently is shown with the next free color, and the screen notes it.

**Emoji set (16):** 🌻 🌵 🍋 🍑 🐶 🐱 🦊 🐻 🐼 🐸 🐙 ☕ 🌙 ⭐ 🎧 🚲

### `activity` (new collection; needs a rules change)
```
at: number               // Date.now()
by: "bre" | "kyle"
action: "add" | "edit" | "delete" | "undo" | "settle"
expenseId: string | null
settlementId: string | null
summary: { amountCents, merchant, payer }          // add/delete/undo: the expense; edit: the expense before the edit
                                                   // settle: { amountCents, from, to }
changes: [{ field, from, to }]                     // edit only; fields that differ
```
- Each entry is written **in the same `writeBatch`** as the change it describes, so they're atomic and work offline. Settle-up adds one entry to its existing batch.
- An undo writes `action: "undo"` (the add stays in the log).
- Recording starts at release. There's no backfill.

**Rules addition** (`firebase-only/firestore.rules`):
```
match /activity/{id} {
  allow read: if isMember();
  allow create: if isMember()
    && request.resource.data.by in ['bre', 'kyle']
    && request.resource.data.action in ['add', 'edit', 'delete', 'undo', 'settle'];
  allow update, delete: if false;
}
```
The rules must be published in the Firebase console **before** the app update is pushed. Otherwise every batched save would be rejected.

## Screens

### Home
- **Header:** greeting (left) with the sync status under it in small muted text. **History** link and **avatar button** (right). The avatar is the emoji in a circle of the person's color, or their initial, with the accessible name "Profile". It's at least 44×44px.
- **Balance, in the second person:** "You owe Kyle" / "Kyle owes you" / "You're even" plus "All square." The amount stays large.
- **Bar and legend** use profile colors. The legend reads "You paid $X" and "Kyle paid $Y", each with an emoji or dot, so it never relies on color alone. The bar keeps `role="img"` with a full text label.
- **Since line:** "6 expenses since you settled on Sep 1, 32 days ago", or "6 expenses so far" if there's never been a settle-up.
- **Rows:** the payer marker becomes the payer's emoji (or initial) in their color, `aria-hidden`. The row text already says who paid.
- **Settle up** button: unchanged.

### Profile (new layer)
Title "Profile", Back button in the dock. Sections, each with an `h2`:
1. **Your look:** emoji (`radiogroup` of 16 plus "Use my initial") and color (`radiogroup` of 8 swatches, each with a visible text name; the partner's is disabled with the text "Kyle's color"). Changes save immediately (not awaited) and show a live preview of the avatar.
2. **Appearance:** Match phone / Light / Dark (`radiogroup`).
3. **This period:** stat tiles computed locally from unsettled expenses: *Days since you settled up* (or *Days since your first expense*), *Shared spending* (the sum of all unsettled amounts), *Top store* (most expenses this period; ties go to the higher total), *Biggest expense* (merchant and amount). If there are no expenses, show "Stats show up once you add expenses."
4. **Account:** "Signed in as Bre" and the email, **Change password**, **Sign out**.

### History
- A segmented control at the top: **Settle-ups** | **Activity** (a `radiogroup`; the selection is remembered for the session).
- **Settle-ups:** unchanged list and detail. The account card moves to Profile.
- **Activity:** a query ordered by `at` descending with a limit of 100, and a **Show more** button that loads the next 100. Grouped by day (Today / Yesterday / date). Each row is a sentence from `copy.js`:
  - add: "Bre added $45.12 at Costco"
  - edit: "Kyle changed Costco: amount $45.12 → $25.00, store Costco → Target" (fields shown in plain names; at most 3 changes listed, then "and 2 more")
  - delete: "Bre deleted $12.00 at Target"
  - undo: "Bre undid $12.00 at Target"
  - settle: "Kyle settled up: Bre paid Kyle $690.22" / "Kyle closed an even period"
  - Each row also shows the time ("3:42 PM"). Rows are read-only.

### Add expense, step 1: amount
- `h1` "Add expense" at about 28px, with "Step 1 of 2" in small muted text under it.
- A visible **"Amount"** label above the display. The display has `aria-labelledby` pointing to it. Hint under the display: "Type it in, or pick a bill." The empty "$0" color is raised to `--muted`.
- **Paid by:** a visible label and a two-option `radiogroup`, **You** | **Kyle** (the partner's name), replacing the toggle pill.
- **Bills:** visible small heading "Bills" (a real heading element) above the row. The row keeps horizontal scroll and adds a right-edge fade when it overflows.
- **Dock:** Cancel | **Next: choose store**. With a bill selected, the button reads "Save Electricity, $645.55" (bills still skip step 2).
- Keyboard digit entry, Backspace, and Enter work as now. Each change to the amount is announced through `announce()`, debounced to 500ms.

### Add expense, step 2: store
- `h1` "Where was it?" at about 28px, with "Step 2 of 2". Below it: "$45.12, paid by you" and an **Edit amount** link (returns to step 1, keeping state).
- A visible label **"Store"** on the search field, with the placeholder "Search, or type a new one".
- **Store list:** all stores **A–Z** (case-insensitive, `localeCompare`), no cap. While searching, only stores whose name contains the query, still A–Z. A radiogroup of tiles. The selected tile gets the accent border (2px) and a ✓ icon.
- **New store:** if the query has no exact match, a tile at the top reads "Add Blue Bottle as a new store". Selecting it reveals a labeled **Category** `<select>` (required, no preselection) directly under the list.
- **Details row:** a full-width button, "Details: Today · split 50/50 · usual category", with `aria-expanded`. The expanded panel holds date, split (`radiogroup`), category, note, and covers, all labeled, as now.
- **Dock:** Back | primary button. Its label is "Choose a store" with nothing selected, otherwise "Save $45.12 at Costco". Pressing it with nothing selected shows "Pick a store first", linked to the list and focused. With a new store and no category, it shows "Pick a category for Blue Bottle", focused on the select.
- **Enter in search:** selects the exact match (or the new-store tile). Enter again saves.
- A store list update from Firestore while this screen is open must not move focus or clear the selection.

### After saving: toast
- `role="status"`. Text from `copy.js`. Buttons: **Undo**, **Edit**, **✕ Dismiss** (accessible name "Dismiss").
- **No auto-hide while it has actions.** It's removed when dismissed, when another layer opens, when another toast replaces it, or when the user signs out. Toasts without actions still auto-hide after 4s (they're informational only).
- Positioned above the dock, and doesn't cover the Add expense button.

### Edit expense
Same fields as now, plus:
- Paid by and Split become labeled `radiogroup`s.
- Errors are linked to the field with `aria-describedby`, the field gets `aria-invalid="true"`, and focus moves to the field.
- Save writes the update and an `edit` activity entry with only the changed fields. Delete writes the delete and a `delete` activity entry with the summary.

## Accessibility plumbing (`ui.js`)

- `openLayer(html, { titleId, opener })`: sets `aria-labelledby` on `#layer`, sets `inert` on `#app`, moves focus to the title (`tabindex="-1"`), and records the opener.
- `closeLayer()`: removes `inert`, restores focus to the opener if it still exists, otherwise to the page's `h1`.
- Remove `aria-live` from `#app`. Add one visually hidden `#announcer` (`aria-live="polite"`). `announce(text)` clears it, then sets it on the next frame.
- `setTitle(screen)`: "Expenses", "Add expense · Expenses", "Where was it? · Expenses", "Profile · Expenses", "History · Expenses", and so on.
- All either/or controls (paid by, split, theme, emoji, color, History tabs, store tiles) are **native `<input type="radio">` in a `<fieldset>` with a visible `<legend>`**, styled as tiles or segments. This gives arrow-key support and checked state for free. Wherever this spec says "radiogroup", it means this pattern.
- Touch targets stay at 44px or more. Focus outlines stay visible in both themes.

## WCAG 2.2 Level A items addressed

| SC | Fix |
|---|---|
| 1.1.1 Non-text content | Emoji avatars are `aria-hidden` next to text. The avatar button has the accessible name "Profile". Swatches have text names. |
| 1.3.1 Info and relationships | Labeled radiogroups. Real headings for sections and bills. Visible labels linked to fields. Errors linked by `aria-describedby`. |
| 1.4.1 Use of color | Selected store gets a ✓ and a border change. Payer shown by name. The partner's color is marked "taken" in text. |
| 2.1.1 Keyboard | Native radios give arrow keys. Everything is reachable by Tab. |
| 2.2.1 Timing adjustable | Toasts with actions don't time out. |
| 2.4.2 Page titled | Title changes per screen. |
| 2.4.3 Focus order | Layers move focus in, make the background inert, and restore focus on close. |
| 2.5.3 Label in name | Accessible names start with the visible text. |
| 3.3.2 Labels or instructions | Visible labels on amount, store, and category. Step hints. |
| 4.1.2 Name, role, value | Layers are named. Choices are native radios (checked state built in). The Details button exposes `aria-expanded`. |

Also fixed, though they're Level AA: the empty "$0" contrast, and announcements made more precise.

## Testing

`python test/run.py` (Playwright with the faked Firebase SDK):
- Update the existing checks for "tap selects, then Save" and second-person balance wording.
- **New checks:**
  - focus moves into each layer and returns to its opener; the home screen is inert while a layer is open
  - an action toast is still visible after 10s; ✕ dismisses it
  - store list is A–Z; searching filters A–Z
  - selecting a store and then saving writes the expense; Save with nothing selected shows the error and doesn't write
  - a new store requires a category
  - Edit amount keeps state
  - profile emoji, color, and theme persist; the partner's color is disabled; the theme applies
  - activity entries are written for add, edit (changed fields only), delete, undo, and settle; the Activity tab lists them
  - stats tiles match the expected values for the seeded data
- **axe-core** (via the `axe-playwright-python` package, test-only) runs on login, home, add step 1, add step 2 (with details open and new-store state), edit, settle, profile, History (both tabs), and settle-up detail, in light and dark mode, with tags `wcag2a` and `wcag21a` (axe has no separate 2.2 Level A tag). Any violation fails the run. The two Level A criteria new in 2.2 are checked by hand: 3.2.6 Consistent help (the app has no help mechanism, so it passes as long as none is added inconsistently) and 3.3.7 Redundant entry (Edit amount keeps everything already entered).
- The fake Firestore (`test/fb-store.js`) gets whatever it needs to support `orderBy("at")`/`limit` on `activity` and the batched writes above, if it doesn't already.

**Manual (owner, iPhone VoiceOver, about 10 minutes):** a script in SETUP.md covering: sign in, hear the balance, add an expense by amount and store, undo it, add a new store with a category, open Profile and change the color, read Activity.

## Rollout

1. Update `firebase-only/firestore.rules`. The owner pastes and publishes them in the Firebase console.
2. Implement and get all tests green.
3. Bump `CACHE` in `sw.js`, push to `main`, and check the live site.
4. Update CLAUDE.md: new files, the `activity` collection, profiles, "tap selects then Save" (replacing "tap a store, and it's saved"), the A–Z store order, and the voice guidance pointing to `copy.js`.

## Out of scope

Restoring deleted expenses, per-person bill visibility, backfilling past activity, the "bills due" card, monthly summaries, CSV export.
