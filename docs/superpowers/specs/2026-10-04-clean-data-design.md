# Clean data: manage stores and bills, duplicate warning

Date: 2026-10-04 · Status: draft for review

## Goal

Keep the shared data tidy without touching locked history, and catch the most likely money mistake (both people logging the same thing).

**Success looks like:**
- A joke or misspelled store can be removed, renamed, or merged in a few taps, and the old name never comes back in the picker.
- Past expenses under an old store name, settled or not, show and count under the new name, and no settled expense is rewritten.
- Bills can be added, edited, retired, and brought back without the Firebase console.
- Saving a likely duplicate asks first.
- Every store or bill change appears in History → Activity.
- All existing checks plus the new ones pass, including the axe Level A scan of every new screen in light and dark mode.

**Unchanged:** money rules, expense and settlement data, $0 running cost, no build step, voice (all wording in `copy.js`), accessibility patterns (native radios in labelled fieldsets, named layers, linked errors).

## Data

### `merchants/{slug}` (existing; new optional fields)
```
name, category, count, lastUsed        // existing
mergedInto: string | null              // slug of the store this name now points to
hidden: boolean                        // true = not shown in the picker (merged or removed)
```
- **Visible store:** `!hidden`.
- **Alias:** `mergedInto` set (always also `hidden: true`).
- **Removed:** `hidden: true` and no `mergedInto`.
- **`canonical(nameOrSlug)`:** take `slug(name)`, follow `mergedInto` up to 10 hops (stop on a cycle or a missing doc), and return the final doc's `name`. If there's no doc, return the original name unchanged.
- No rules change for `merchants`: the existing `allow read, write: if isMember()` covers it.

### `bills/{id}` (existing; no new fields)
`name, usualCents, category, payer, order, active`. A new bill's ID is `slug(name)`, with `-2`, `-3`, and so on added if that ID is taken. Its `order` is the current highest plus 1.

### `activity` (existing; two new actions)
```
action: "store" | "bill"                       // new, alongside add/edit/delete/settle
kind:   store: "rename" | "merge" | "category" | "remove" | "restore"
        bill:  "add" | "edit" | "retire" | "restore"
summary: { name, to? , amountCents? }          // name = the store/bill as it was; to = new/target name
changes: [{ field, from, to }]                 // bill edit and store category only
```
Each entry is written in the same `writeBatch` as the change it describes.

**Rules change** (the only one). In `match /activity/{id}`, `allow create`:
```
&& request.resource.data.action in ['add', 'edit', 'delete', 'settle', 'store', 'bill'];
```
The owner publishes it **before** the app update is pushed.

## Where it lives

Profile gets a new section, **Shared lists** (after "This period", before "Account"), with two full-width buttons: **Stores** and **Bills**. Each opens a full-screen layer. **Back** on a list returns to Profile. **Back** on a detail returns to its list.

## Stores

### Stores list (layer, title "Stores")
- A search field with the visible label "Search stores". Visible stores are listed A–Z (`localeCompare`, base sensitivity). Each row is a button: the name, with the usual category under it.
- At the bottom, the heading **Removed stores** lists removed (not merged) stores, each with a **Bring back** button. The heading is hidden when there are none.

### Store detail (layer, title is the store's name)
- **Name** (text input, labelled) with a **Save name** button.
  - Same slug as now (only capitals or punctuation change): update `name` only. Activity kind `rename`.
  - New slug matching another **visible** store: show the inline message "There's already a store called {X}." with a **Merge into {X}** button, which does a merge.
  - New slug matching a hidden or removed doc, or no doc: write the new doc `{ name, category, count: old.count, hidden: false, mergedInto: null }` (merge into any existing doc), and mark the old one `{ hidden: true, mergedInto: newSlug }`. Activity kind `rename`.
  - Empty name: the error "Enter a name", linked to the field.
- **Usual category** (labelled select). It saves on change, with activity kind `category` and a change from → to.
- **Merge into another store:** a labelled search plus a radiogroup of the other visible stores, A–Z, and the button **Merge into {selected}** (disabled-looking but still focusable until something is selected; pressing it with nothing selected shows "Pick a store to merge into"). Result: old `{ hidden: true, mergedInto: target }`, target `count += old.count`. Activity kind `merge`. Then return to the Stores list.
- **Remove store:** a two-tap confirm ("Remove store" → "Tap again to remove"), matching the existing Delete pattern. Result: `{ hidden: true }`. Activity kind `remove`. Then return to the list.
- **Bring back** (on the Removed list): `{ hidden: false }`. Activity kind `restore`.

### Aliases everywhere else
- **Expense rows, settle-up detail lists, the Activity sentences for add/edit/delete,** and **profile stats** show `canonical(e.merchant)`. Stats group by canonical name.
- **Add-expense store search** also matches alias names. A match shows the canonical tile with "also called {alias}" under the category. An exact alias match counts as an exact match, so no "Add … as a new store" tile appears.
- **Duplicate check** compares canonical names.
- **Edit expense:** the Store field shows the canonical name. The no-change check compares `canonical(orig.merchant)` to the new value, so opening and saving an aliased expense isn't a change.

## Duplicate warning

**When:** on the first press of Save in add step 2, and on the first press of "Save {bill}" in step 1.

- **Stores:** some expense in `S.expenses` (unsettled) has `canonical(e.merchant) === canonical(name)`, the same `amountCents`, and `|daysBetween(e.date, A.date)| <= 3`.
- **Bills:** `getDocs(query(collection(db, "expenses"), where("billId", "==", id)))` returns an expense with the same `YYYY-MM` as `A.date`, settled or not. If the query fails (offline with no cached result), fall back to `S.expenses`.

**How:** instead of saving, show a warning card directly above the dock: `{You|Kyle} added {amount} {at store|for bill} on {Mon D}. Add this one too?` with two buttons, **Add anyway** (saves) and **Don't add** (hides the card and keeps the form as it is). The card has `role="alert"`, and focus moves to its text (`tabindex="-1"`). Changing the amount, store, or bill hides the card. The most recent match is the one described.

## Bills

### Bills list (layer, title "Bills")
- **Active bills** in `order`: each row is a button showing "{name}" and, under it, "{usual amount} · usually {You|Kyle}".
- **Retired bills** (heading hidden when there are none): same rows.
- **Add bill** button at the top of the list.

### Bill form (layer, title "Add bill" or the bill's name)
- **Name** (required; unique among all bills, case-insensitive). Errors: "Enter a name" and "There's already a bill called {X}".
- **Usual amount** (`inputmode="decimal"`; between 0.01 and 100000). Error: "Enter an amount, like 64.50".
- **Category** (select).
- **Usually paid by** (the existing `payerFieldset`).
- **Save** writes the bill and the activity entry: kind `add`, or kind `edit` with only the changed fields. If nothing changed: "Nothing changed." and no write.
- For an existing bill: **Retire bill** (`active: false`, kind `retire`) or **Bring back** (`active: true`, kind `restore`).
- Errors are linked with `aria-describedby`, the field gets `aria-invalid`, and focus moves to it.
- Renaming a bill affects future entries only. Reordering is out of scope.

## Copy (in `copy.js`)

| Moment | Copy |
|---|---|
| Rename | "Bre renamed Ralph's to Ralphs" |
| Merge | "Kyle merged Trader Joes into Trader Joe's" |
| Category | "Bre changed Costco's usual category: Groceries → Home & household" |
| Remove / restore store | "Bre removed the store Love and affection" / "Bre brought back the store Love and affection" |
| Bill add | "Kyle added the bill Trash, usually $40.00" |
| Bill edit | "Bre changed Electricity: usual amount $645.55 → $700.00, usually paid by Kyle → Bre" (at most 3 changes, then "and N more") |
| Retire / restore bill | "Bre retired the bill Gardener" / "Bre brought back the bill Gardener" |
| Duplicate | "Kyle added $45.12 at Costco on Oct 3. Add this one too?" / "You added $645.55 for Electricity on Oct 1. Add this one too?" |
| Toasts | "Store renamed." "Stores merged." "Store removed." "Store is back." "Bill saved." "Bill retired." "Bill is back." |

## Testing

New suites (`test/suite_stores.py`, `test/suite_bills.py`, `test/suite_dupes.py`), all using the fake SDK:
- **Stores:**
  - Rename with the same slug; rename to a new slug (old becomes an alias, the expense row shows the new name, search for the old name finds the new store, and no "Add as new" tile appears).
  - Rename onto an existing visible store offers a merge.
  - Merge (counts add up, rows show the target, stats group under it).
  - Category change; remove and bring back; empty-name error.
  - An edit-and-save of an aliased expense logs nothing.
- **Bills:** add (ID, order, appears in step 1); edit only the changed fields; a no-change save writes nothing; retire hides it from step 1; bring back; the name, duplicate-name, and amount errors.
- **Duplicates:**
  - Store match within 3 days, including through an alias; no warning at 4 days or for a different amount.
  - Bill match in the same month, including after a settle-up.
  - **Add anyway** saves; **Don't add** keeps the form; focus moves to the warning.
- **Activity:** each store and bill sentence.
- **axe:** Stores list, store detail (with the merge picker and the error), Bills list, bill form (with an error), and the duplicate warning, in light and dark mode.

## Rollout

1. Update `firebase-only/firestore.rules`. The owner publishes it.
2. Build with tests green, then bump `CACHE`.
3. Merge to `main` and push. Verify the live site.
4. Update CLAUDE.md (merchant fields, the alias rule, the new activity actions, where Shared lists lives).

## Out of scope

Reordering bills; bill renames that rewrite past entries; un-merging (a merged alias can't be split back out; renaming or merging again is the fix); merging bills.
