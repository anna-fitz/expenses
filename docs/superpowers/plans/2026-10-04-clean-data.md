# Clean Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage stores (rename, merge, remove, restore, category) and bills (add, edit, retire, restore) from Profile, show aliased store names everywhere, warn before likely duplicates, and log every store and bill change.

**Architecture:** A new pure module, `stores.js`, owns `slug`, alias resolution (`canonicalSlug`, `canonicalName`), the picker list (`pickerStores`), `removedStores`, and `planRename`, all testable by importing them in the page. `app.js` gets the Stores and Bills layers, the duplicate check, and alias-aware display. All wording goes in `copy.js`. Every change is a `writeBatch` with its activity entry.

**Tech Stack:** HTML/CSS/JS modules, Firebase JS SDK 12.19.0, Firestore; tests in Python + Playwright + `axe-playwright-python` against the fake SDK.

**Spec:** `docs/superpowers/specs/2026-10-04-clean-data-design.md`

## Global Constraints

- $0 to run, no paid APIs, no build step. Firebase SDK stays at `12.19.0`.
- No email addresses in committed files. Before each commit, `git grep -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" | grep -v noreply@anthropic.com` must print nothing.
- All user-facing strings live in `copy.js`. Voice: warm and plain, sentence case.
- Accessibility: every either/or choice is a native radio in a labelled fieldset. Layers use `openLayer` with `<h1 id="layer-title">`. Errors are linked with `aria-describedby`, the field gets `aria-invalid`, and focus moves to it. Touch targets are at least 44px.
- Settled expenses are never rewritten. The alias approach must not update any `expenses` doc.
- Every store or bill write goes in a `writeBatch` with `logEntry(b, { action: "store" | "bill", kind, summary, changes })`.
- New files go in `sw.js` `SHELL` in the task that creates them. `CACHE` is bumped once, in Task 5.
- Test command: `python test/run.py`. All suites must pass at the end of every task.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `clean-data`. No push until Task 5 Step 6 and the owner's go-ahead.

## Review Focus

1. **Typing into a field while a live update arrives:** a merchants or bills snapshot must not wipe what's half-typed in the store name, merge search, or bill form. Only list regions re-render. → Task 2 test "stores: live update keeps typed name", Task 3 "bills: live update keeps typed form".
2. **Alias chains and cycles:** A→B→C resolves to C. A↔B (corrupt data) must not hang. → Task 1 pure tests.
3. **Re-adding a removed store's name** through "Add … as a new store" must make it visible again, not save into a hidden doc. → Task 1 test "aliases: re-adding a removed store un-hides it".
4. **Duplicate check while offline or before the bill query returns:** the warning must not show over a closed layer or a different bill. → Task 4 guard plus test "dupes: bill check ignores a changed bill".
5. **Merging a store into one that later gets merged elsewhere:** expense rows follow the full chain. → Task 2 test "stores: chained merges resolve".

---

### Task 1: `stores.js` and alias-aware display

**Files:**
- Create: `stores.js`, `test/suite_aliases.py`
- Modify: `app.js` (import `slug` and the others from `stores.js`; delete the local `slug` and `storeList`; update `rowHTML`, `periodStats`, `statsHTML`, `openEdit`, `saveEdit`, `renderStoreList`, the Enter handler, `learnStore`, `activityHTML`, the merchants snapshot), `copy.js` (`activityLine` takes `canon`), `sw.js` (`SHELL`), `test/run.py`

**Interfaces:**
- Produces (`stores.js`):
  - `slug(s) -> string`
  - `canonicalSlug(merchants, nameOrSlug) -> string`
  - `canonicalName(merchants, name) -> string`
  - `pickerStores(merchants, q) -> [{ id, name, category, alsoCalled: string|null, exact: bool }]`, A–Z, visible canonical stores only
  - `removedStores(merchants) -> [{ id, name }]`, A–Z
  - `planRename(merchants, id, newName) -> { kind: "empty" } | { kind: "same", name } | { kind: "conflict", targetId, targetName } | { kind: "move", newId, name }`
- Produces (`copy.js`): `activityLine(a, names, canon = n => n)`

- [ ] **Step 1: Write the failing test `test/suite_aliases.py`**

```python
from harness import *

FIXTURE = """{
  'trader-joes': {name: "Trader Joe's", category: 'Groceries'},
  'tjs': {name: 'TJs', category: 'Groceries', hidden: true, mergedInto: 'trader-joes'},
  'tj': {name: 'TJ', hidden: true, mergedInto: 'tjs'},
  'loop-a': {name: 'Loop A', hidden: true, mergedInto: 'loop-b'},
  'loop-b': {name: 'Loop B', hidden: true, mergedInto: 'loop-a'},
  'gone': {name: 'Gone', hidden: true},
  'costco': {name: 'Costco', category: 'Groceries'}}"""

def run(b):
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate(f"""import('./stores.js').then(m => {{ const M = {FIXTURE}; return [
      m.canonicalName(M, 'TJ'), m.canonicalName(M, 'TJs'), m.canonicalName(M, 'costco'), m.canonicalName(M, 'Unknown Place'),
      typeof m.canonicalName(M, 'Loop A'),
      m.pickerStores(M, '').map(s => s.name),
      m.pickerStores(M, 'tjs').map(s => [s.name, s.alsoCalled, s.exact]),
      m.pickerStores(M, 'joe').map(s => [s.id, s.alsoCalled, s.exact]),
      m.pickerStores(M, 'costco').map(s => [s.id, s.alsoCalled, s.exact]),
      m.removedStores(M).map(s => s.id),
      m.planRename(M, 'costco', 'COSTCO'), m.planRename(M, 'costco', "Trader Joe's"),
      m.planRename(M, 'costco', 'Costco Wholesale'), m.planRename(M, 'costco', '   ').kind]; }})""")
    check('aliases: chain resolves', r[0] == "Trader Joe's" and r[1] == "Trader Joe's")
    check('aliases: plain and unknown names', r[2] == 'Costco' and r[3] == 'Unknown Place')
    check('aliases: cycle terminates', r[4] == 'string')
    check('aliases: picker shows visible canonical stores A–Z', r[5] == ['Costco', "Trader Joe's"])
    check('aliases: picker finds a store by its old name, exact', r[6] == [["Trader Joe's", 'TJs', True]])
    check('aliases: substring of the current name', r[7] == [['trader-joes', None, False]])
    check('aliases: direct exact match', r[8] == [['costco', None, True]])
    check('aliases: removed list', r[9] == ['gone'])
    check('aliases: rename same slug', r[10] == {'kind': 'same', 'name': 'COSTCO'})
    check('aliases: rename onto a visible store is a conflict', r[11] == {'kind': 'conflict', 'targetId': 'trader-joes', 'targetName': "Trader Joe's"})
    check('aliases: rename to a new slug moves', r[12] == {'kind': 'move', 'newId': 'costco-wholesale', 'name': 'Costco Wholesale'})
    check('aliases: empty rename', r[13] == 'empty')
    c.close()
    # In the app
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    fs_write(pg, 'merchants/costco', {'hidden': True, 'mergedInto': 'trader-joes'})
    check('aliases: expense row shows the new name', "Trader Joe's" in pg.inner_text('#app .row .t'))
    start_add(pg); keys(pg, '5'); next_step(pg); pg.fill('#w-q', 'costco'); pg.wait_for_timeout(50)
    vals = pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.value)")
    check('aliases: searching the old name finds the new store, no add tile', vals == ['trader-joes'] and 'also called Costco' in pg.inner_text('#w-list'))
    pg.keyboard.press('Escape')
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    before = len(activity(pg))
    pg.click(f'[data-act=edit][data-id="{eid}"]')
    check('aliases: edit shows the new name', pg.input_value('#e-store') == "Trader Joe's")
    pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    check('aliases: saving an aliased expense unchanged logs nothing', len(activity(pg)) == before and pg.inner_text('#toast span') == 'Nothing changed.')
    pg.click('[data-act=profile]')
    check('aliases: stats count under the new name', "Trader Joe's" in pg.inner_text('.stats'))
    pg.click('[data-act=close]')
    # Review Focus 3: re-adding a removed store's name un-hides it
    fs_write(pg, 'merchants/aldi', {'hidden': True})
    start_add(pg); keys(pg, '3'); next_step(pg); save_new_store(pg, 'Aldi', 'Groceries')
    check('aliases: re-adding a removed store un-hides it', st(pg)['merchants/aldi'].get('hidden') is False)
    c.close()
```
Add `suite_aliases` to `SUITES` in `test/run.py`, after `suite_history`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: `suite_aliases` FAILs (`stores.js` 404, then the row text checks).

- [ ] **Step 3: Create `stores.js`**

```js
// Store names: slugs, aliases (merged or renamed stores), and the lists the pickers show.
// Pure functions over the `merchants` map ({ [slug]: { name, category, count, hidden, mergedInto } }).
export const slug = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "store";

// Follow mergedInto up to 10 hops; stop on a cycle or a missing target.
export function canonicalSlug(merchants, nameOrSlug) {
  let id = slug(nameOrSlug);
  const seen = new Set();
  while (merchants[id] && merchants[id].mergedInto && !seen.has(id) && seen.size < 10) {
    seen.add(id);
    const next = merchants[id].mergedInto;
    if (!merchants[next]) break;
    id = next;
  }
  return id;
}
export function canonicalName(merchants, name) {
  const m = merchants[canonicalSlug(merchants, name)];
  return m && m.name ? m.name : String(name);
}
const byName = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

// Visible stores matching q by their own name or any alias name. One row per canonical store.
export function pickerStores(merchants, q) {
  const ql = String(q || "").trim().toLowerCase(), out = new Map();
  for (const [id, m] of Object.entries(merchants)) {
    if (!m || !m.name) continue;
    const isAlias = !!m.mergedInto, target = isAlias ? canonicalSlug(merchants, id) : id, t = merchants[target];
    if (!t || !t.name || t.hidden) continue;
    const own = m.name.toLowerCase();
    if (ql && !own.includes(ql)) continue;
    const row = out.get(target) || { id: target, name: t.name, category: t.category || "", alsoCalled: null, exact: false, direct: false };
    if (!isAlias) { row.direct = true; row.alsoCalled = null; }
    else if (ql && !row.direct && !row.alsoCalled) row.alsoCalled = m.name;
    if (ql && own === ql) row.exact = true;
    out.set(target, row);
  }
  return [...out.values()].map(({ direct, ...r }) => r).sort(byName);
}
export function removedStores(merchants) {
  return Object.entries(merchants).filter(([, m]) => m && m.name && m.hidden && !m.mergedInto)
    .map(([id, m]) => ({ id, name: m.name })).sort(byName);
}
export function planRename(merchants, id, newName) {
  const name = String(newName || "").trim().replace(/\s+/g, " ");
  if (!name) return { kind: "empty" };
  const newId = slug(name);
  if (newId === id) return { kind: "same", name };
  const other = merchants[newId];
  if (other && other.name && !other.hidden) return { kind: "conflict", targetId: newId, targetName: other.name };
  return { kind: "move", newId, name };
}
```

- [ ] **Step 4: Use `stores.js` in `app.js`**

1. Add the import: `import { slug, canonicalSlug, canonicalName, pickerStores, removedStores, planRename } from "./stores.js";`. Delete the local `const slug = …` line and the `storeList` function.
2. `rowHTML`: replace `${esc(e.merchant)}` with `${esc(canonicalName(S.merchants, e.merchant))}`.
3. `periodStats`: replace the `for` loop with
```js
  for (const e of list) { const n = canonicalName(S.merchants, e.merchant); const m = by[n] = by[n] || { name: n, count: 0, cents: 0 }; m.count++; m.cents += e.amountCents | 0; }
```
   and in `statsHTML`, use `${esc(canonicalName(S.merchants, s.big.merchant))}` for the biggest expense's store.
4. `openEdit`: the `#e-store` value becomes `${esc(canonicalName(S.merchants, e.merchant))}`.
5. `saveEdit`: replace the `changes` computation with
```js
  const base = Object.assign({}, E.orig, { merchant: canonicalName(S.merchants, E.orig.merchant) });
  const changes = EDIT_FIELDS.filter(f => (base[f] ?? "") !== (data[f] ?? ""))
    .map(f => ({ field: f, from: base[f] ?? "", to: data[f] ?? "" }));
```
6. `renderStoreList`: replace `list = storeList(q)` with `list = pickerStores(S.merchants, q)`, and `exact = list.find(m => m.name.toLowerCase() === q.toLowerCase())` with `exact = list.find(m => m.exact)`. The tile builder's subtitle for stores becomes `[m.category, m.alsoCalled ? \`also called ${m.alsoCalled}\` : ""].filter(Boolean).join(" · ")`.
7. Enter handler: `const exact = pickerStores(S.merchants, q).find(m => m.exact), want = exact ? exact.id : NEW;`
8. `learnStore`: add `hidden: false` to the merged fields: `{ name, category, count: increment(1), lastUsed: Date.now(), hidden: false }`.
9. `activityHTML`: `activityLine(a, PEOPLE, n => canonicalName(S.merchants, n))`.
10. Merchants snapshot: after `if (A.step === "where") renderStoreList();` add `render();`.

- [ ] **Step 5: Make `activityLine` alias-aware in `copy.js`**

Change the signature to `export function activityLine(a, names, canon = n => n)`. In the `add`, `delete`, and `edit` cases, use `canon(s.merchant)` wherever `s.merchant` appears.

- [ ] **Step 6: Add `"./stores.js"` to `SHELL` in `sw.js`** (after `"./copy.js"`).

- [ ] **Step 7: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add stores.js app.js copy.js sw.js test/suite_aliases.py test/run.py
git commit -m "Add stores.js: store aliases resolve everywhere names are shown"
```

---

### Task 2: Stores screens (Profile → Shared lists → Stores)

**Files:**
- Create: `test/suite_stores.py`
- Modify: `app.js` (state `M`; `openStores`, `renderStores`, `fillStores`, `openStore`, `renderStore`, `mergeLabel`, `fillMergeList`, `storeBatch`, `mref`, `patchLocal`, `renameStore`, `mergeStore`, `setStoreCategory`, `removeStore`, `restoreStore`; Shared lists section in `renderProfile`; handlers; snapshot), `copy.js` (strings, `storeExists`, `mergeHelp`, store activity sentences), `index.html` (CSS), `test/harness.py` (`open_stores`), `test/suite_profile.py` (sections check)

**Interfaces:**
- Consumes: `pickerStores`, `removedStores`, `planRename` (Task 1), `logEntry`, `openLayer`, `keepFocus`, `announce`
- Produces: layer `S.layer` values `"stores"` and `"store"`; activity entries `{ action: "store", kind, summary: { name, to? }, changes? }`; Profile buttons `data-act="open-stores"` and `data-act="open-bills"` (the Bills button is wired in Task 3)

- [ ] **Step 1: Write the failing test `test/suite_stores.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    pg.click('[data-act=profile]')
    check('stores: Shared lists in Profile', pg.locator('#layer [data-act=open-stores]').count() == 1)
    pg.click('[data-act=open-stores]'); pg.wait_for_timeout(50)
    check('stores: list screen', pg.inner_text('#layer-title') == 'Stores' and pg.inner_text('label[for=st-q]') == 'Search stores')
    names = pg.evaluate("[...document.querySelectorAll('#st-list [data-act=store-open] .t')].map(e => e.textContent)")
    check('stores: A–Z', len(names) == 23 and names == sorted(names, key=str.lower))
    pg.fill('#st-q', 'ral'); pg.wait_for_timeout(50)
    check('stores: search filters', pg.evaluate("[...document.querySelectorAll('#st-list [data-act=store-open]')].map(e => e.dataset.id).join()") == 'ralphs')
    pg.click('[data-act=store-open][data-id=ralphs]'); pg.wait_for_timeout(50)
    check('stores: detail screen', pg.inner_text('#layer-title') == 'Ralphs')
    # rename, same slug
    pg.fill('#sd-name', 'RALPHS'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(100)
    a = [x for x in activity(pg) if x['action'] == 'store']
    check('stores: rename same slug', st(pg)['merchants/ralphs']['name'] == 'RALPHS' and a[-1]['kind'] == 'rename'
          and a[-1]['summary'] == {'name': 'Ralphs', 'to': 'RALPHS'})
    # rename, new slug
    pg.fill('#sd-name', 'Ralphs Fresh Fare'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(100)
    s = st(pg)
    check('stores: rename to a new slug', s['merchants/ralphs-fresh-fare'].get('hidden') is False and s['merchants/ralphs-fresh-fare']['count'] == 38
          and s['merchants/ralphs'] .get('mergedInto') == 'ralphs-fresh-fare' and pg.inner_text('#layer-title') == 'Ralphs Fresh Fare')
    # Review Focus 1: a live update doesn't wipe a half-typed name
    pg.fill('#sd-name', 'Ralphs Fresh'); fs_write(pg, 'merchants/zzz', {'name': 'Zzz', 'category': 'Other', 'count': 1})
    check('stores: live update keeps typed name', pg.input_value('#sd-name') == 'Ralphs Fresh')
    # rename onto an existing store offers a merge
    pg.fill('#sd-name', 'Costco'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(50)
    check('stores: conflict offers a merge', pg.is_visible('#sd-conflict') and 'There’s already a store called Costco.' in pg.inner_text('#sd-conflict'))
    pg.click('#sd-conflict [data-act=store-merge-into]'); pg.wait_for_timeout(100)
    s = st(pg)
    check('stores: merged via conflict', s['merchants/ralphs-fresh-fare']['mergedInto'] == 'costco' and s['merchants/costco']['count'] == 58
          and pg.inner_text('#layer-title') == 'Stores')
    # Review Focus 5: chained merges resolve in expense rows
    pg.keyboard.press('Escape')
    fs_write(pg, 'expenses/fx1', {'amountCents': 900, 'payer': 'bre', 'merchant': 'Ralphs', 'category': 'Groceries', 'date': '2026-10-01',
                                  'split': 'half', 'settled': False, 'createdBy': 'bre', 'createdAt': 1})
    check('stores: chained merges resolve', 'Costco' in pg.inner_text(f'#app [data-id=fx1] .t'))
    # category
    pg.click('[data-act=profile]'); pg.click('[data-act=open-stores]'); pg.click('[data-act=store-open][data-id=target]')
    pg.select_option('#sd-cat', 'Gifts & occasions'); pg.wait_for_timeout(100)
    a = [x for x in activity(pg) if x['action'] == 'store'][-1]
    check('stores: category saved + logged', st(pg)['merchants/target']['category'] == 'Gifts & occasions' and a['kind'] == 'category'
          and a['changes'] == [{'field': 'category', 'from': 'Home & household', 'to': 'Gifts & occasions'}])
    # empty name
    pg.fill('#sd-name', ''); pg.click('[data-act=store-rename]')
    check('stores: empty name error', pg.inner_text('#sd-err') == 'Enter a name' and pg.get_attribute('#sd-name', 'aria-invalid') == 'true'
          and pg.evaluate('document.activeElement.id') == 'sd-name')
    # merge via picker, with and without a choice
    pg.click('[data-act=store-back]'); pg.click('[data-act=store-open][data-id=aldi]')
    pg.click('#sm-go')
    check('stores: merge needs a choice', pg.inner_text('#sm-err') == 'Pick a store to merge into')
    pg.fill('#sm-q', 'sprou'); pg.wait_for_timeout(50); pg.check('input[name=merge-target][value=sprouts]')
    check('stores: merge button names the target', pg.inner_text('#sm-go') == 'Merge into Sprouts')
    pg.click('#sm-go'); pg.wait_for_timeout(100)
    check('stores: merged via picker', st(pg)['merchants/aldi']['mergedInto'] == 'sprouts')
    # remove and bring back
    pg.click('[data-act=store-open][data-id=fuel]'); pg.click('#sd-remove')
    check('stores: remove asks twice', pg.inner_text('#sd-remove') == 'Tap again to remove' and not st(pg)['merchants/fuel'].get('hidden'))
    pg.click('#sd-remove'); pg.wait_for_timeout(100)
    check('stores: removed', st(pg)['merchants/fuel'].get('hidden') is True and 'mergedInto' not in st(pg)['merchants/fuel']
          and 'Fuel' in pg.inner_text('#layer') and pg.locator('[data-act=store-restore][data-id=fuel]').count() == 1)
    pg.click('[data-act=store-restore][data-id=fuel]'); pg.wait_for_timeout(100)
    check('stores: brought back', st(pg)['merchants/fuel'].get('hidden') is False)
    c.close()
    # activity sentences
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => { const N = {bre: 'Bre', kyle: 'Kyle'}; return [
      m.activityLine({by: 'bre', action: 'store', kind: 'rename', summary: {name: "Ralph's", to: 'Ralphs'}}, N),
      m.activityLine({by: 'kyle', action: 'store', kind: 'merge', summary: {name: 'Trader Joes', to: "Trader Joe's"}}, N),
      m.activityLine({by: 'bre', action: 'store', kind: 'category', summary: {name: 'Costco'}, changes: [{field: 'category', from: 'Groceries', to: 'Home & household'}]}, N),
      m.activityLine({by: 'bre', action: 'store', kind: 'remove', summary: {name: 'Love and affection'}}, N),
      m.activityLine({by: 'bre', action: 'store', kind: 'restore', summary: {name: 'Love and affection'}}, N)]; })""")
    check('stores: activity sentences', r == ["Bre renamed Ralph's to Ralphs", "Kyle merged Trader Joes into Trader Joe's",
        'Bre changed Costco’s usual category: Groceries → Home & household', 'Bre removed the store Love and affection',
        'Bre brought back the store Love and affection'])
    c.close()
```
Add `suite_stores` to `SUITES`. Add to `test/harness.py`:
```python
def open_stores(pg): pg.click('[data-act=profile]'); pg.click('[data-act=open-stores]'); pg.wait_for_timeout(50)
```

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: `suite_stores` FAILs (no `open-stores` button).

- [ ] **Step 3: Strings in `copy.js`**

Add to `C`:
```js
  storeRenamed: "Store renamed.", storesMerged: "Stores merged.", storeRemoved: "Store removed.", storeBack: "Store is back.",
  categorySaved: "Category saved.", enterName: "Enter a name", pickMerge: "Pick a store to merge into", noStores: "No stores match.",
  removeHelp: "It disappears from the store picker. Past expenses keep their name, and you can bring it back from the Stores list.",
```
Add exports:
```js
export const storeExists = name => `There’s already a store called ${name}.`;
export const mergeHelp = name => `Past expenses at ${name} will show and count under the store you pick.`;
```
In `activityLine`, add before the final `return`:
```js
    case "store": {
      const n = s.name, c = (a.changes || [])[0] || {};
      if (a.kind === "rename") return `${who} renamed ${n} to ${s.to}`;
      if (a.kind === "merge") return `${who} merged ${n} into ${s.to}`;
      if (a.kind === "category") return `${who} changed ${n}’s usual category: ${c.from} → ${c.to}`;
      if (a.kind === "remove") return `${who} removed the store ${n}`;
      if (a.kind === "restore") return `${who} brought back the store ${n}`;
      break;
    }
```

- [ ] **Step 4: Implement the Stores screens in `app.js`**

Add `storeExists, mergeHelp` to the `copy.js` import. Add a section after the Profiles section:
```js
/* ---------------- Shared lists: stores ---------------- */
const M = { q: "", id: null, confirmRemove: false, mergeQ: "", mergeSel: null };
const mref = id => doc(db, "merchants", id);
function patchLocal(id, patch) { S.merchants = Object.assign({}, S.merchants, { [id]: Object.assign({}, S.merchants[id] || {}, patch) }); }
function storeBatch(fn, entry, msg) {
  const b = writeBatch(db); fn(b); logEntry(b, Object.assign({ action: "store" }, entry)); b.commit().catch(writeFailed);
  if (msg) toast(msg);
}
function openStores() { M.q = ""; M.id = null; renderStores(); }
function renderStores() {
  S.layer = "stores";
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Stores</h1></div></header>
    <div class="scroll"><div class="inner">
      <label class="label" for="st-q">Search stores</label>
      <input id="st-q" class="search" autocomplete="off" value="${esc(M.q)}">
      <div id="st-list"></div>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="lists-back">Back</button></div></footer>
  </div>`);
  fillStores();
}
// Only the list re-renders, so typing in the search box is never interrupted.
function fillStores() {
  const box = $("#st-list"); if (!box) return;
  const list = pickerStores(S.merchants, M.q), removed = removedStores(S.merchants);
  keepFocus(() => {
    box.innerHTML = `<div class="rows" style="margin-top:12px">${list.length ? list.map(m => `<button class="row" data-act="store-open" data-id="${esc(m.id)}">
        <span class="main"><span class="t">${esc(m.name)}</span><span class="s">${esc([m.category, m.alsoCalled ? `also called ${m.alsoCalled}` : ""].filter(Boolean).join(" · "))}</span></span></button>`).join("")
        : `<p class="muted" style="padding:12px 16px;margin:0">${esc(C.noStores)}</p>`}</div>`
      + (removed.length ? `<h2 class="sec">Removed stores</h2><ul class="rows plain">${removed.map(m => `<li class="row"><span class="main"><span class="t">${esc(m.name)}</span></span>
        <button class="btn fit" data-act="store-restore" data-id="${esc(m.id)}" aria-label="Bring back ${esc(m.name)}">Bring back</button></li>`).join("")}</ul>` : "");
  }, "#st-q");
}
function openStore(id) { Object.assign(M, { id, confirmRemove: false, mergeQ: "", mergeSel: null }); renderStore(); }
function renderStore() {
  const m = S.merchants[M.id]; if (!m) return renderStores();
  S.layer = "store";
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">${esc(m.name)}</h1></div></header>
    <div class="scroll"><div class="inner">
      <label class="label" for="sd-name">Name</label>
      <input id="sd-name" class="input" value="${esc(m.name)}" autocapitalize="words" autocomplete="off">
      <p class="err left" id="sd-err" hidden></p>
      <div id="sd-conflict" hidden></div>
      <button class="btn" style="width:100%;margin-top:10px" data-act="store-rename">Save name</button>
      <label class="label" for="sd-cat">Usual category</label>
      <select id="sd-cat" class="input">${CATEGORIES.map(c => `<option ${m.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <section aria-labelledby="h-merge"><h2 id="h-merge" class="sec">Merge into another store</h2>
        <p class="help" style="margin:0 0 8px">${esc(mergeHelp(m.name))}</p>
        <label class="label" for="sm-q">Search stores</label>
        <input id="sm-q" class="search" autocomplete="off" value="${esc(M.mergeQ)}">
        <p class="err left" id="sm-err" hidden></p>
        <div id="sm-list"></div>
        <button class="btn" style="width:100%;margin-top:10px" data-act="store-merge" id="sm-go" aria-describedby="sm-err">${esc(mergeLabel())}</button>
      </section>
      <section aria-labelledby="h-remove"><h2 id="h-remove" class="sec">Remove</h2>
        <p class="help" style="margin:0 0 8px">${esc(C.removeHelp)}</p>
        <button class="btn danger" style="width:100%" data-act="store-remove" id="sd-remove">Remove store</button></section>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="store-back">Back</button></div></footer>
  </div>`);
  fillMergeList();
}
function mergeLabel() { const t = M.mergeSel && S.merchants[M.mergeSel]; return t ? `Merge into ${t.name}` : "Merge into another store"; }
function fillMergeList() {
  const box = $("#sm-list"); if (!box) return;
  const list = pickerStores(S.merchants, M.mergeQ).filter(s => s.id !== M.id);
  if (M.mergeSel && !list.some(s => s.id === M.mergeSel)) M.mergeSel = null;
  keepFocus(() => {
    box.innerHTML = list.length ? `<fieldset class="fs" aria-describedby="sm-err"><legend class="sr">Store to merge into</legend><div class="grid">${list.map(s =>
      `<label class="store"><input type="radio" name="merge-target" value="${esc(s.id)}" ${M.mergeSel === s.id ? "checked" : ""}>
        <span>${esc(s.name)}<small>${esc(s.category)}</small></span><span class="tick" aria-hidden="true">✓</span></label>`).join("")}</div></fieldset>`
      : `<p class="muted">${esc(C.noStores)}</p>`;
  }, "#sm-q");
  const go = $("#sm-go"); if (go) go.textContent = mergeLabel();
}
function renameStore() {
  const m = S.merchants[M.id], input = $("#sd-name"), err = $("#sd-err"), conflict = $("#sd-conflict");
  const plan = planRename(S.merchants, M.id, input.value);
  input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); err.hidden = true; conflict.hidden = true;
  if (plan.kind === "empty") {
    err.textContent = C.enterName; err.hidden = false;
    input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "sd-err"); input.focus(); return;
  }
  if (plan.kind === "conflict") {
    conflict.innerHTML = `<p class="help">${esc(storeExists(plan.targetName))}</p>
      <button class="btn" style="width:100%" data-act="store-merge-into" data-id="${esc(plan.targetId)}">Merge into ${esc(plan.targetName)}</button>`;
    conflict.hidden = false; announce(storeExists(plan.targetName)); conflict.querySelector("button").focus(); return;
  }
  if (plan.name === m.name) return;
  const summary = { name: m.name, to: plan.name };
  if (plan.kind === "same") {
    storeBatch(b => b.set(mref(M.id), { name: plan.name }, { merge: true }), { kind: "rename", summary }, C.storeRenamed);
    patchLocal(M.id, { name: plan.name });
  } else {
    const fresh = { name: plan.name, category: m.category || "Other", count: m.count || 0, hidden: false, mergedInto: null };
    storeBatch(b => { b.set(mref(plan.newId), fresh, { merge: true }); b.set(mref(M.id), { hidden: true, mergedInto: plan.newId }, { merge: true }); },
      { kind: "rename", summary }, C.storeRenamed);
    patchLocal(plan.newId, fresh); patchLocal(M.id, { hidden: true, mergedInto: plan.newId }); M.id = plan.newId;
  }
  renderStore();
}
function mergeStore(targetId) {
  const m = S.merchants[M.id], t = targetId && S.merchants[targetId];
  if (!t) {
    const e = $("#sm-err"); e.textContent = C.pickMerge; e.hidden = false; announce(C.pickMerge);
    ($("#sm-list input") || $("#sm-q")).focus(); return;
  }
  storeBatch(b => { b.set(mref(M.id), { hidden: true, mergedInto: targetId }, { merge: true }); b.set(mref(targetId), { count: increment(m.count || 0) }, { merge: true }); },
    { kind: "merge", summary: { name: m.name, to: t.name } }, C.storesMerged);
  patchLocal(M.id, { hidden: true, mergedInto: targetId }); patchLocal(targetId, { count: (t.count || 0) + (m.count || 0) });
  M.id = null; renderStores();
}
function setStoreCategory(cat) {
  const m = S.merchants[M.id]; if (!m || m.category === cat) return;
  storeBatch(b => b.set(mref(M.id), { category: cat }, { merge: true }),
    { kind: "category", summary: { name: m.name }, changes: [{ field: "category", from: m.category || "", to: cat }] }, C.categorySaved);
  patchLocal(M.id, { category: cat });
}
function removeStore() {
  const btn = $("#sd-remove"), m = S.merchants[M.id];
  if (!M.confirmRemove) { M.confirmRemove = true; btn.textContent = "Tap again to remove"; return; }
  storeBatch(b => b.set(mref(M.id), { hidden: true }, { merge: true }), { kind: "remove", summary: { name: m.name } }, C.storeRemoved);
  patchLocal(M.id, { hidden: true }); M.id = null; renderStores();
}
function restoreStore(id) {
  const m = S.merchants[id]; if (!m) return;
  storeBatch(b => b.set(mref(id), { hidden: false }, { merge: true }), { kind: "restore", summary: { name: m.name } }, C.storeBack);
  patchLocal(id, { hidden: false }); fillStores();
}
```
**Profile:** in `renderProfile`, after `${statsHTML()}`, add:
```js
      <section aria-labelledby="h-lists"><h2 id="h-lists" class="sec">Shared lists</h2>
        <div class="btnrow" style="margin-top:0"><button class="btn" data-act="open-stores">Stores</button><button class="btn" data-act="open-bills">Bills</button></div></section>
```
**Click cases:**
```js
    case "open-stores": openStores(); break;
    case "lists-back": openProfile(); break;
    case "store-open": openStore(el.dataset.id); break;
    case "store-back": M.id = null; renderStores(); break;
    case "store-rename": renameStore(); break;
    case "store-merge": mergeStore(M.mergeSel); break;
    case "store-merge-into": mergeStore(el.dataset.id); break;
    case "store-remove": removeStore(); break;
    case "store-restore": restoreStore(el.dataset.id); break;
```
**Change listener:**
```js
  if (t.id === "sd-cat") setStoreCategory(t.value);
  if (t.name === "merge-target") { M.mergeSel = t.value; $("#sm-err").hidden = true; $("#sm-go").textContent = mergeLabel(); }
```
**Input listener:**
```js
  if (ev.target.id === "st-q") { M.q = ev.target.value; fillStores(); }
  if (ev.target.id === "sm-q") { M.mergeQ = ev.target.value; fillMergeList(); }
```
**Keydown:** `if (ev.key === "Enter" && ev.target.id === "sd-name") { ev.preventDefault(); renameStore(); }`
**Merchants snapshot:** after `renderStoreList` add `if (S.layer === "stores") fillStores(); if (S.layer === "store") fillMergeList();`. These redraw lists only, never the name field.
**CSS** (`index.html`, before `/* Toast */`): `.btn.fit{flex:none;min-height:44px;padding:0 14px}`

**Profile test:** in `test/suite_profile.py`, change the sections expectation to `'Your look|Appearance|This period|Shared lists|Account'`.

- [ ] **Step 5: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app.js copy.js index.html test/harness.py test/suite_stores.py test/suite_profile.py test/run.py
git commit -m "Stores screen: rename, merge, category, remove, bring back — all logged"
```

---

### Task 3: Bills screens

**Files:**
- Create: `test/suite_bills.py`
- Modify: `app.js` (state `B`, `BILL_FIELDS`; `openBills`, `renderBills`, `billRow`, `openBill`, `renderBill`, `saveBill`, `setBillActive`; `payerFieldset` gets a `legend` parameter; handlers; bills snapshot), `copy.js` (strings, `billExists`, bill activity sentences, `usualCents` in `showVal`), `test/harness.py` (`open_bills`)

**Interfaces:**
- Consumes: `payerFieldset`, `logEntry`, `toCents`, `slug`
- Produces: `S.layer` values `"bills"` and `"bill"`; activity `{ action: "bill", kind: "add"|"edit"|"retire"|"restore", summary: { name, amountCents? }, changes? }`

- [ ] **Step 1: Write the failing test `test/suite_bills.py`**

```python
from harness import *

def rows(pg, sel): return pg.evaluate(f"[...document.querySelectorAll('{sel}')].map(e => e.dataset.id).join()")

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    open_bills(pg)
    check('bills: list screen', pg.inner_text('#layer-title') == 'Bills')
    check('bills: active in order', rows(pg, '#bl-active [data-act=bill-open]') == 'electricity,internet,gas-bill,water,pool-service,gardener')
    check('bills: row text', 'Electricity' in pg.inner_text('#bl-active') and '$645.55 · usually Kyle' in pg.inner_text('#bl-active'))
    # add: validation
    pg.click('[data-act=bill-new]'); pg.wait_for_timeout(50)
    check('bills: add form', pg.inner_text('#layer-title') == 'Add bill' and pg.inner_text('#bf-payer-set legend') == 'Usually paid by')
    pg.click('[data-act=bill-save]')
    check('bills: name required', pg.inner_text('#bf-err') == 'Enter a name' and pg.evaluate('document.activeElement.id') == 'bf-name')
    pg.fill('#bf-name', 'electricity'); pg.fill('#bf-amt', '40'); pg.click('[data-act=bill-save]')
    check('bills: name must be new', pg.inner_text('#bf-err') == 'There’s already a bill called Electricity')
    pg.fill('#bf-name', 'Trash'); pg.fill('#bf-amt', 'abc'); pg.click('[data-act=bill-save]')
    check('bills: amount checked', pg.inner_text('#bf-err') == 'Enter an amount, like 64.50' and pg.get_attribute('#bf-amt', 'aria-invalid') == 'true'
          and pg.get_attribute('#bf-name', 'aria-invalid') is None)
    # Review Focus 1: a live update doesn't wipe the half-typed form
    fs_write(pg, 'bills/water', {'usualCents': 28100})
    check('bills: live update keeps typed form', pg.input_value('#bf-name') == 'Trash' and pg.input_value('#bf-amt') == 'abc')
    pg.fill('#bf-amt', '40'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    t = st(pg).get('bills/trash', {})
    check('bills: added', t.get('usualCents') == 4000 and t.get('order') == 7 and t.get('active') is True and t.get('payer') == 'kyle'
          and t.get('category') == 'Utilities' and pg.inner_text('#layer-title') == 'Bills')
    a = [x for x in activity(pg) if x['action'] == 'bill'][-1]
    check('bills: add logged', a['kind'] == 'add' and a['summary'] == {'name': 'Trash', 'amountCents': 4000})
    # ID collision
    pg.click('[data-act=bill-new]'); pg.fill('#bf-name', 'Water!'); pg.fill('#bf-amt', '12'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    check('bills: id collision gets a suffix', st(pg).get('bills/water-2', {}).get('name') == 'Water!')
    # edit
    pg.click('[data-act=bill-open][data-id=electricity]')
    pg.fill('#bf-amt', '700'); pg.check('input[name=bf-payer][value=bre]'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    a = [x for x in activity(pg) if x['action'] == 'bill'][-1]
    check('bills: edit logs only changes', a['kind'] == 'edit' and a['summary'] == {'name': 'Electricity'}
          and a['changes'] == [{'field': 'usualCents', 'from': 64555, 'to': 70000}, {'field': 'payer', 'from': 'kyle', 'to': 'bre'}])
    n = len(activity(pg))
    pg.click('[data-act=bill-open][data-id=electricity]'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    check('bills: no-change save writes nothing', len(activity(pg)) == n and pg.inner_text('#toast span') == 'Nothing changed.')
    # retire / bring back
    pg.click('[data-act=bill-open][data-id=gardener]'); pg.click('[data-act=bill-retire]'); pg.wait_for_timeout(100)
    check('bills: retired', st(pg)['bills/gardener']['active'] is False and 'gardener' in rows(pg, '#bl-retired [data-act=bill-open]'))
    pg.keyboard.press('Escape'); start_add(pg)
    chips = pg.evaluate("[...document.querySelectorAll('[data-act=bill]')].map(e => e.dataset.id).join()")
    check('bills: step 1 follows the list', 'gardener' not in chips and 'trash' in chips)
    pg.keyboard.press('Escape'); open_bills(pg)
    pg.click('[data-act=bill-open][data-id=gardener]'); pg.click('[data-act=bill-restore]'); pg.wait_for_timeout(100)
    check('bills: brought back', st(pg)['bills/gardener']['active'] is True)
    c.close()
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => { const N = {bre: 'Bre', kyle: 'Kyle'}; return [
      m.activityLine({by: 'kyle', action: 'bill', kind: 'add', summary: {name: 'Trash', amountCents: 4000}}, N),
      m.activityLine({by: 'bre', action: 'bill', kind: 'edit', summary: {name: 'Electricity'}, changes: [
        {field: 'usualCents', from: 64555, to: 70000}, {field: 'payer', from: 'kyle', to: 'bre'}]}, N),
      m.activityLine({by: 'bre', action: 'bill', kind: 'retire', summary: {name: 'Gardener'}}, N),
      m.activityLine({by: 'bre', action: 'bill', kind: 'restore', summary: {name: 'Gardener'}}, N)]; })""")
    check('bills: activity sentences', r == ['Kyle added the bill Trash, usually $40.00',
        'Bre changed Electricity: usual amount $645.55 → $700.00, usually paid by Kyle → Bre',
        'Bre retired the bill Gardener', 'Bre brought back the bill Gardener'])
    c.close()
```
Add `suite_bills` to `SUITES`. Add to `test/harness.py`:
```python
def open_bills(pg): pg.click('[data-act=profile]'); pg.click('[data-act=open-bills]'); pg.wait_for_timeout(50)
```

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: `suite_bills` FAILs (Bills button does nothing).

- [ ] **Step 3: Strings in `copy.js`**

Add to `C`: `billSaved: "Bill saved.", billRetired: "Bill retired.", billBack: "Bill is back.", enterBillAmount: "Enter an amount, like 64.50", noBills: "No active bills.",`
Add the export: `export const billExists = name => \`There’s already a bill called ${name}\`;`
In `showVal`, add as its second line: `if (field === "usualCents") return fmt(v);`
Add `const BILL_FIELD_NAMES = { name: "name", usualCents: "usual amount", category: "category", payer: "usually paid by" };` and a shared helper. Then refactor the existing `edit` case to use it:
```js
function changeList(changes, fieldNames, names) {
  const ch = (changes || []).map(c => `${fieldNames[c.field] || c.field} ${showVal(c.field, c.from, names)} → ${showVal(c.field, c.to, names)}`);
  return ch.slice(0, 3).join(", ") + (ch.length > 3 ? `, and ${ch.length - 3} more` : "");
}
```
The `edit` case becomes `return \`${who} changed ${canon(s.merchant)}: ${changeList(a.changes, FIELD_NAMES, names)}\`;`. Add to `activityLine`:
```js
    case "bill": {
      if (a.kind === "add") return `${who} added the bill ${s.name}, usually ${fmt(s.amountCents)}`;
      if (a.kind === "edit") return `${who} changed ${s.name}: ${changeList(a.changes, BILL_FIELD_NAMES, names)}`;
      if (a.kind === "retire") return `${who} retired the bill ${s.name}`;
      if (a.kind === "restore") return `${who} brought back the bill ${s.name}`;
      break;
    }
```

- [ ] **Step 4: Implement the Bills screens in `app.js`**

Change `payerFieldset` to `function payerFieldset(name, value, legend = "Paid by")` and use `${legend}` in its `<legend>`. Add `billExists` to the `copy.js` import. Add after the stores section:
```js
/* ---------------- Shared lists: bills ---------------- */
const B = { id: null, payer: "kyle" };
const BILL_FIELDS = ["name", "usualCents", "category", "payer"];
const billsSorted = () => S.bills.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
function billRow(b) {
  return `<button class="row" data-act="bill-open" data-id="${esc(b.id)}"><span class="main"><span class="t">${esc(b.name)}</span>
    <span class="s">${esc(`${fmt(b.usualCents || 0)} · usually ${b.payer === S.me ? "you" : PEOPLE[b.payer] || PEOPLE.kyle}`)}</span></span></button>`;
}
function openBills() { renderBills(); }
function renderBills() {
  S.layer = "bills";
  const all = billsSorted(), act = all.filter(b => b.active !== false), ret = all.filter(b => b.active === false);
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Bills</h1></div></header>
    <div class="scroll"><div class="inner">
      <button class="btn" style="width:100%" data-act="bill-new">Add bill</button>
      <h2 class="sec">Active bills</h2>
      <div class="rows" id="bl-active">${act.length ? act.map(billRow).join("") : `<p class="muted" style="padding:12px 16px;margin:0">${esc(C.noBills)}</p>`}</div>
      ${ret.length ? `<h2 class="sec">Retired bills</h2><div class="rows" id="bl-retired">${ret.map(billRow).join("")}</div>` : ""}
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="lists-back">Back</button></div></footer>
  </div>`);
}
function openBill(id) {
  const b = id && S.bills.find(x => x.id === id);
  B.id = b ? b.id : null; B.payer = b ? (b.payer || "kyle") : "kyle"; renderBill();
}
function renderBill() {
  const b = B.id && S.bills.find(x => x.id === B.id);
  S.layer = "bill";
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">${esc(b ? b.name : "Add bill")}</h1></div></header>
    <div class="scroll"><div class="inner">
      <p class="err left" id="bf-err" hidden></p>
      <label class="label" for="bf-name">Name</label><input id="bf-name" class="input" value="${esc(b ? b.name : "")}" autocapitalize="words" autocomplete="off">
      <label class="label" for="bf-amt">Usual amount</label><input id="bf-amt" class="input" inputmode="decimal" placeholder="64.50" value="${b ? (b.usualCents / 100).toFixed(2) : ""}">
      <label class="label" for="bf-cat">Category</label>
      <select id="bf-cat" class="input">${CATEGORIES.map(c => `<option ${(b ? b.category : "Utilities") === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <div style="margin-top:14px">${payerFieldset("bf-payer", B.payer, "Usually paid by")}</div>
      ${b ? `<button class="btn${b.active === false ? "" : " danger"}" style="width:100%;margin-top:24px" data-act="${b.active === false ? "bill-restore" : "bill-retire"}">${b.active === false ? "Bring back" : "Retire bill"}</button>` : ""}
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="bill-back">Back</button>
      <button class="btn primary grow2" data-act="bill-save">Save</button></div></footer>
  </div>`);
}
function saveBill() {
  const b = B.id && S.bills.find(x => x.id === B.id), err = $("#bf-err");
  const name = $("#bf-name").value.trim().replace(/\s+/g, " "), cents = toCents($("#bf-amt").value), cat = $("#bf-cat").value;
  const fail = (msg, id) => {
    ["bf-name", "bf-amt"].forEach(x => { const f = $("#" + x); f.removeAttribute("aria-invalid"); f.removeAttribute("aria-describedby"); });
    const f = $("#" + id); f.setAttribute("aria-invalid", "true"); f.setAttribute("aria-describedby", "bf-err");
    err.textContent = msg; err.hidden = false; f.focus();
  };
  if (!name) return fail(C.enterName, "bf-name");
  const clash = S.bills.find(x => x.id !== B.id && (x.name || "").toLowerCase() === name.toLowerCase());
  if (clash) return fail(billExists(clash.name), "bf-name");
  if (!cents || cents > 10000000) return fail(C.enterBillAmount, "bf-amt");
  const data = { name: name.slice(0, 80), usualCents: cents, category: cat, payer: B.payer };
  const wb = writeBatch(db);
  if (!b) {
    let id = slug(name), n = 2;
    while (S.bills.some(x => x.id === id)) id = `${slug(name)}-${n++}`;
    const order = Math.max(0, ...S.bills.map(x => x.order || 0)) + 1;
    wb.set(doc(db, "bills", id), Object.assign({ order, active: true }, data));
    logEntry(wb, { action: "bill", kind: "add", summary: { name: data.name, amountCents: cents } });
  } else {
    const changes = BILL_FIELDS.filter(f => (b[f] ?? "") !== data[f]).map(f => ({ field: f, from: b[f] ?? "", to: data[f] }));
    if (!changes.length) { toast(C.noChanges); return renderBills(); }
    wb.update(doc(db, "bills", b.id), data);
    logEntry(wb, { action: "bill", kind: "edit", summary: { name: b.name }, changes });
  }
  wb.commit().catch(writeFailed); toast(C.billSaved); renderBills();
}
function setBillActive(active) {
  const b = S.bills.find(x => x.id === B.id); if (!b) return;
  const wb = writeBatch(db);
  wb.update(doc(db, "bills", b.id), { active });
  logEntry(wb, { action: "bill", kind: active ? "restore" : "retire", summary: { name: b.name } });
  wb.commit().catch(writeFailed); toast(active ? C.billBack : C.billRetired); renderBills();
}
```
**Click cases:**
```js
    case "open-bills": openBills(); break;
    case "bill-new": openBill(null); break;
    case "bill-open": openBill(el.dataset.id); break;
    case "bill-back": renderBills(); break;
    case "bill-save": saveBill(); break;
    case "bill-retire": setBillActive(false); break;
    case "bill-restore": setBillActive(true); break;
```
**Change listener:** `if (t.name === "bf-payer") B.payer = t.value;`
**Bills snapshot:** change it to `snap => { S.bills = …; if (S.layer === "bills") renderBills(); }`. The bill form is never redrawn by a snapshot, so typing is safe.

- [ ] **Step 5: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app.js copy.js test/harness.py test/suite_bills.py test/run.py
git commit -m "Bills screen: add, edit, retire, bring back — all logged"
```

---

### Task 4: Duplicate warning

**Files:**
- Create: `test/suite_dupes.py`
- Modify: `app.js` (`dayGap`, `storeDuplicate`, `billDuplicate`, `showDup`, `hideDup`; `amountNext` becomes async; `saveWhere` tail; `renderAmount`/`renderWhere`/`startAdd`/`pressKey` reset; handlers), `copy.js` (`dupLine`), `index.html` (CSS)

**Interfaces:**
- Consumes: `canonicalSlug`, `canonicalName`, `daysBetween`, `shortDate`, `getDocs`, `where`
- Produces: `#dup` card (`role="alert"`, `#dup-msg` focusable) with `data-act="dup-ok"` and `data-act="dup-cancel"`; `A.dupOk`

- [ ] **Step 1: Write the failing test `test/suite_dupes.py`**

```python
from harness import *
import datetime

def md(d): return f"{d:%b} {d.day}"

def run(b):
    today = datetime.date.today()
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: store warning', pg.is_visible('#dup') and pg.inner_text('#dup-msg') == f'You added $45.12 at Costco on {md(today)}. Add this one too?'
          and pg.evaluate('document.activeElement.id') == 'dup-msg' and len(expenses(pg)) == 1)
    pg.click('[data-act=dup-cancel]')
    check('dupes: Don’t add keeps the form', not pg.is_visible('#dup') and pg.inner_text('#layer-title') == 'Where was it?' and len(expenses(pg)) == 1)
    pg.click('#w-save'); pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(100)
    check('dupes: Add anyway saves', len(expenses(pg)) == 2)
    start_add(pg); keys(pg, '45.13'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: different amount, no warning', len(expenses(pg)) == 3)
    for gap, warn in ((4, False), (3, True)):
        d = today - datetime.timedelta(days=gap)
        start_add(pg); keys(pg, '45.12'); next_step(pg); open_details(pg); pg.fill('#o-date', d.isoformat()); save_at_store(pg, 'costco')
        check(f'dupes: {gap} days apart → warning {warn}', pg.is_visible('#dup') == warn)
        if warn: pg.keyboard.press('Escape')
    c.close()
    # alias: an expense logged under an old name counts
    c = new_ctx(b); pg = open_app(c); login(pg)
    fs_write(pg, 'merchants/costco-old', {'name': 'Costco Old', 'hidden': True, 'mergedInto': 'costco'})
    fs_write(pg, 'expenses/fx1', {'amountCents': 4512, 'payer': 'kyle', 'merchant': 'Costco Old', 'category': 'Groceries', 'date': today.isoformat(),
                                  'split': 'half', 'settled': False, 'createdBy': 'kyle', 'createdAt': 1})
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: match through an alias', pg.inner_text('#dup-msg') == f'Kyle added $45.12 at Costco on {md(today)}. Add this one too?')
    pg.keyboard.press('Escape')
    # bills, including after a settle-up
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: first bill saves', len([e for e in expenses(pg) if e.get('billId') == 'water']) == 1)
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: bill warning', pg.inner_text('#dup-msg') == f'You added $280.00 for Water on {md(today)}. Add this one too?')
    pg.click('[data-act=key][data-k=back]')
    check('dupes: changing the amount hides it', not pg.is_visible('#dup'))
    pg.keyboard.press('Escape')
    pg.click('[data-act=settle]'); pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: settled bill this month still counts', pg.is_visible('#dup'))
    pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(150)
    check('dupes: bill Add anyway saves', len([e for e in expenses(pg) if e.get('billId') == 'water' and not e.get('settled')]) == 1 and pg.evaluate("document.getElementById('layer').hidden"))
    # Review Focus 4: a slow bill check must not warn about a bill the user moved away from
    start_add(pg); pg.click('[data-act=bill][data-id=water]')
    pg.evaluate("window.__slowGetDocs = 300"); next_step(pg); pg.click('[data-act=clear-bill]'); pg.wait_for_timeout(500)
    pg.evaluate("window.__slowGetDocs = 0")
    check('dupes: bill check ignores a changed bill', not pg.is_visible('#dup') and pg.inner_text('#layer-title') == 'Add expense')
    c.close()
```
Add `suite_dupes` to `SUITES`. In `test/fb-store.js`, make `getDocs` honour an optional delay (a test-only hook):
```js
export async function getDocs(q){ if(window.__slowGetDocs) await new Promise(r=>setTimeout(r,window.__slowGetDocs)); return run(q.kind?q:{path:q.path,cs:[]}); }
```

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: `suite_dupes` FAILs (no `#dup`).

- [ ] **Step 3: Implement in `app.js`**

Add `dupLine` to the `copy.js` import, and add to `copy.js`:
```js
export const dupLine = (who, amount, kind, name, date) => `${who} added ${amount} ${kind === "bill" ? "for" : "at"} ${name} on ${date}. Add this one too?`;
```
Add a section before Saving:
```js
/* ---------------- Duplicate warning ---------------- */
const dayGap = (a, b) => (a <= b ? daysBetween(a, b) : daysBetween(b, a));
const newestFirst = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
function storeDuplicate(name, cents, date) {
  const key = canonicalSlug(S.merchants, name);
  return S.expenses.filter(e => e.amountCents === cents && canonicalSlug(S.merchants, e.merchant) === key && dayGap(e.date, date) <= 3)
    .sort(newestFirst)[0] || null;
}
// Includes settled bills: reads by billId (single-field index) and filters the month here.
async function billDuplicate(billId, date) {
  let list;
  try { list = (await getDocs(query(collection(db, "expenses"), where("billId", "==", billId)))).docs.map(d => d.data()); }
  catch (e) { list = S.expenses.filter(x => x.billId === billId); }
  return list.filter(x => (x.date || "").slice(0, 7) === date.slice(0, 7)).sort(newestFirst)[0] || null;
}
function showDup(e, kind, name) {
  hideDup();
  const by = e.createdBy || e.payer, who = by === S.me ? "You" : PEOPLE[by];
  $("#layer .dock").insertAdjacentHTML("beforebegin", `<div class="dup" id="dup" role="alert"><div class="inner">
    <p id="dup-msg" tabindex="-1">${esc(dupLine(who, fmt(e.amountCents), kind, name, shortDate(e.date)))}</p>
    <div class="btnrow"><button class="btn" data-act="dup-cancel">Don’t add</button><button class="btn primary" data-act="dup-ok">Add anyway</button></div></div></div>`);
  $("#dup-msg").focus();
}
function hideDup() { const d = $("#dup"); if (d) d.remove(); A.dupOk = false; }
```
Add `dupOk: false` to `startAdd`'s `Object.assign`. Add `A.dupOk = false;` as the first line of `renderAmount` and of `renderWhere`. In `pressKey`, add `hideDup();` after `$("#amt-err").hidden = true;`.
Replace `amountNext` with:
```js
async function amountNext() {
  const c = toCents(A.buf || "");
  if (!c) { const e = $("#amt-err"); e.textContent = "Enter an amount"; e.hidden = false; announce("Enter an amount"); return; }
  A.cents = c;
  if (A.bill) {
    const bill = A.bill;
    if (!A.dupOk) {
      const d = await billDuplicate(bill.id, A.date);
      if (A.bill !== bill || A.step !== "amount" || $("#layer").hidden) return;   // the user moved on while we checked
      if (d) return showDup(d, "bill", bill.name);
    }
    saveNew(bill.name, bill.category || "Utilities", { billId: bill.id, covers: new Date().toLocaleDateString("en-US", { month: "long" }) });
    return;
  }
  A.step = "where"; renderWhere();
}
```
Replace the tail of `saveWhere` (from `readOpts();` down) with:
```js
  readOpts();
  let name, category;
  if (A.sel === NEW) {
    name = cleanQ(); const sel = $("#w-cat");
    if (!A.newCat) { sel.setAttribute("aria-invalid", "true"); return fail(`Pick a category for ${name}`, sel); }
    category = A.newCat;
  } else {
    const m = S.merchants[A.sel]; if (!m) return; name = m.name; category = m.category;
  }
  if (!A.dupOk) { const d = storeDuplicate(name, A.cents, A.date); if (d) return showDup(d, "store", canonicalName(S.merchants, name)); }
  saveNew(name, category);
```
**Click cases:**
```js
    case "dup-ok": { const d = $("#dup"); if (d) d.remove(); A.dupOk = true; if (A.step === "amount") amountNext(); else saveWhere(); break; }
    case "dup-cancel": hideDup(); ($("#w-save") || $("[data-act=next]")).focus(); break;
```
**Hide on change:** in the change listener's `store` and `w-cat` branches, and in the input listener's `w-q` branch and its `o-date`/`o-cat`/`o-note`/`o-covers` branch, call `hideDup();`.
**CSS** (before `/* Toast */`):
```css
.dup{flex:none;padding:12px 20px 0;background:var(--warn-bg);color:var(--warn);border-top:1px solid var(--line)}
.dup p{margin:0 0 10px;font-weight:600}
.dup .btnrow{margin:0;padding-bottom:12px}
```

- [ ] **Step 4: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js copy.js index.html test/fb-store.js test/suite_dupes.py test/run.py
git commit -m "Warn before saving a likely duplicate (stores within 3 days, bills within the month)"
```

---

### Task 5: Accessibility scan, docs, release

**Files:**
- Modify: `test/suite_axe.py`, `sw.js` (`CACHE` → v4), `README.md`, `CLAUDE.md` (local, gitignored)

- [ ] **Step 1: Extend the axe scan**

Inside the `for scheme` loop in `test/suite_axe.py`, before `c.close()`:
```python
        go_home(pg)
        open_stores(pg); scan(pg, f'{scheme} stores list')
        pg.click('[data-act=store-open][data-id=target]'); pg.click('#sm-go'); scan(pg, f'{scheme} store detail + error')
        pg.fill('#sd-name', 'Costco'); pg.click('[data-act=store-rename]'); scan(pg, f'{scheme} store rename conflict')
        pg.click('[data-act=store-back]'); pg.click('[data-act=lists-back]'); pg.click('[data-act=open-bills]'); scan(pg, f'{scheme} bills list')
        pg.click('[data-act=bill-new]'); pg.click('[data-act=bill-save]'); scan(pg, f'{scheme} bill form + error')
        pg.keyboard.press('Escape')
        for _ in range(2): start_add(pg); keys(pg, '12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
        scan(pg, f'{scheme} duplicate warning')
        pg.keyboard.press('Escape')
```
`go_home` is needed because the loop ends on the History screen. The loop settles everything earlier, so the duplicate scan adds the same expense twice.

- [ ] **Step 2: Run, and fix any violation at its source**

Run: `python test/run.py`
Expected: every line PASS. If an `axe A:` line fails, fix the markup in the screen it names (labels, names, linked errors), then re-run until clean. Don't suppress rules.

- [ ] **Step 3: Bump `CACHE`** in `sw.js` to `"shared-expenses-v4"`.

- [ ] **Step 4: Docs**

- `README.md`, "How it works": add the bullet "Stores and bills can be renamed, merged, retired, or brought back from Profile → Shared lists, and the app asks before saving a likely duplicate." Add to the file table: `| \`stores.js\` | Store names: aliases after a rename or merge, and the store lists |`.
- `CLAUDE.md` (local):
  - **Files:** add `stores.js`.
  - **Collections:** for `merchants`, add "`hidden`, `mergedInto` (alias → canonical slug); expenses are never rewritten — names resolve through `canonicalName`".
  - **`activity`:** add actions `store` (kinds rename/merge/category/remove/restore) and `bill` (kinds add/edit/retire/restore).
  - **Design principles:** add "Duplicate warning: same canonical store + amount within 3 days, or same bill in the same month (settled included); never blocks." and "Stores and bills are managed in Profile → Shared lists."

- [ ] **Step 5: Final run, email check, commit**

Run: `python test/run.py` → all PASS.
Run: `git grep -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" | grep -v noreply@anthropic.com` → prints nothing.
```bash
git add test/suite_axe.py sw.js README.md
git commit -m "axe covers stores, bills, duplicate warning; docs; cache v4"
```

- [ ] **Step 6: Release** (owner go-ahead required)

Confirm with the owner that the published rules include `'store', 'bill'` in the activity `action` list. Then merge `clean-data` into `main` (fast-forward), run the tests on `main`, and push. Check `https://anna-fitz.github.io/expenses/sw.js` serves `shared-expenses-v4` and that `stores.js` returns 200.
