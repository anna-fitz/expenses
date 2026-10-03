# UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a profile (look, appearance, stats, account), an activity log, a clearer two-step add flow, and a warm voice, and meet WCAG 2.2 Level A on every screen.

**Architecture:** Plain ES modules with no build step. `ui.js` owns accessibility plumbing (layers, focus, announcer, toast, titles). `copy.js` owns every user-facing string and display formatter. `app.js` keeps screens, state, and Firestore. Tests are Playwright suites run against a fake Firebase SDK, plus an axe-core scan.

**Tech Stack:** HTML/CSS/JS modules, Firebase JS SDK 12.19.0 (gstatic), Firestore, Python 3 + Playwright + `axe-playwright-python` (tests only).

**Spec:** `docs/superpowers/specs/2026-10-03-ux-refresh-design.md`

## Global Constraints

- $0 to run: Firebase Spark only, no Cloud Functions, no Cloud Storage, no paid APIs, no AI calls.
- No build step. Firebase SDK stays at `12.19.0` from `https://www.gstatic.com/firebasejs/12.19.0/`.
- **No email addresses in any committed file.** Real emails live only in `firebase-only/firestore.rules` and `test/accounts.local.json`, both gitignored. Before every commit, run `git grep -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}"`. It must print nothing.
- Money is integer cents. Positive net means Bre owes Kyle. Don't change `calc()`.
- Voice: warm and plain, sentence case, no jokes. All user-facing strings live in `copy.js`.
- Touch targets are at least 44px. Light and dark mode both work. The layout works at 375×667.
- Every either/or choice is a native `<input type="radio">` inside `<fieldset class="fs">` with a visible `<legend>` (or `.sr` legend when a visible heading already labels it).
- After changing any cached file, `CACHE` in `sw.js` is bumped once, at release (Task 12). New app files go into `SHELL` in the task that creates them.
- Test command (from the repo root): `python test/run.py`. If Playwright's bundled Chromium is unavailable, use `PW_CHANNEL=msedge python test/run.py`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push until Task 12.

## Review Focus

1. **Short phones (375×667):** the new Amount label, hint, and Paid-by control must not push the keypad under the bottom bar. → Task 5, step "small screen overlap".
2. **Filtering hides the selected store:** if the search filters out the selected store, the selection clears and Save goes back to "Choose a store". It must never save a store the user can't see. → Task 6.
3. **Live data refresh while interacting:** a Firestore update (the partner adds a store, or a profile changes) must not move focus or clear a selection. → Task 6 (store list) and Task 8 (profile radios).
4. **Edit with no real changes:** must write nothing and log nothing. → Task 7.
5. **Both people end up with the same color** (saved at the same time offline): the display must still show two different colors. → Task 8.

---

## File map

| File | Change |
|---|---|
| `ui.js` | **Create.** `esc`, `openLayer`, `closeLayer`, `resetLayer`, `keepFocus`, `announce`, `setTitle`, `toast`, `hideToast` |
| `copy.js` | **Create.** Formatters (`fmt`, `iso`, `todayISO`, `parseISO`, `shortDate`, `longDate`, `dayLabel`, `timeOf`), the strings object `C`, `greeting`, `balanceLine`, `sinceLine`, `savedLine`, `activityLine`, `COLOR_NAMES`, `EMOJI_NAMES` |
| `app.js` | **Modify.** Import from `ui.js`/`copy.js`; new screens and flows |
| `index.html` | **Modify.** Announcer, theme variables, new CSS, early theme script |
| `sw.js` | **Modify.** `SHELL` += `./ui.js`, `./copy.js`; `CACHE` bump at release |
| `firebase-only/firestore.rules` | **Modify (gitignored).** `activity` rules |
| `test/harness.py` | **Create.** Server, browser, contexts, login, flow helpers, `check` |
| `test/run.py` | **Rewrite.** Runs suites, prints results, exits non-zero on failure |
| `test/suite_core.py` | **Create.** The original 24 checks, ported |
| `test/suite_layers.py`, `suite_voice.py`, `suite_activity.py`, `suite_add.py`, `suite_edit.py`, `suite_profile.py`, `suite_history.py`, `suite_axe.py` | **Create** in their tasks |
| `test/accounts.local.json` | **Create, gitignored.** Real sign-in emails for tests |
| `.gitignore` | Stop ignoring `test/`; ignore `test/accounts.local.json`, `test/*.png`, `test/__pycache__/` |
| `CLAUDE.md`, `SETUP.md`, `README.md` | **Modify** in Task 12 |

---

### Task 1: Test harness split, test emails moved out, tests version-controlled

**Files:**
- Create: `test/harness.py`, `test/suite_core.py`, `test/accounts.local.json`
- Rewrite: `test/run.py`
- Modify: `.gitignore`

**Interfaces:**
- Produces (in `test/harness.py`):
  - `check(name: str, cond) -> None`, plus the list `R` and `ERRS: list[str]` (page errors)
  - `ACC: dict` with keys `bre`, `kyle`, `kyle_messy`, `stranger`
  - `NAMES = {'bre': 'Bre', 'kyle': 'Kyle'}`, `URL`, `SITE`, `HERE`
  - `start_server() -> Popen`, `launch(p) -> Browser`
  - `new_ctx(b, scheme='light', vp=(390, 844), sw='block') -> BrowserContext`
  - `open_app(c) -> Page`, `login(pg, who='bre')`, `logout(pg)`
  - `st(pg) -> dict`, `expenses(pg) -> list`, `activity(pg) -> list`, `fs_write(pg, path, data)`
  - Flow helpers (later tasks change only their bodies): `start_add(pg)`, `keys(pg, s)`, `set_payer(pg, who)`, `current_payer(pg) -> str`, `next_step(pg)`, `save_at_store(pg, store_id)`, `save_new_store(pg, name, category)`, `open_details(pg)`, `set_split(pg, v)`, `go_home(pg)`, `open_history(pg)`, `open_account(pg)`, `leave_account(pg)`
  - Each `test/suite_*.py` exposes `run(b) -> None`

- [ ] **Step 1: Create `test/accounts.local.json`**

Copy the real addresses out of the **old** `test/run.py`. Don't type them into this plan or any committed file.
```json
{
  "bre": "<Bre's sign-in email, from the old run.py>",
  "kyle": "<Kyle's sign-in email, lowercase>",
  "kyle_messy": "<Kyle's email as the old test typed it: mixed case with a trailing space>",
  "stranger": "<the stranger address used by the old run.py>"
}
```

- [ ] **Step 2: Update `.gitignore`**

Replace the line `test/` and its comment with:
```
# Test sign-in emails stay local
test/accounts.local.json
test/*.png
test/__pycache__/
```

- [ ] **Step 3: Create `test/harness.py`**

```python
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..'))
ACC = json.load(open(os.path.join(HERE, 'accounts.local.json'), encoding='utf-8'))
NAMES = {'bre': 'Bre', 'kyle': 'Kyle'}
PORT = 8765
URL = f'http://localhost:{PORT}/'
SDK = 'https://www.gstatic.com/firebasejs/12.19.0/'
FAKES = {'firebase-app.js': 'fb-app.js', 'firebase-auth.js': 'fb-auth.js', 'firebase-firestore.js': 'fb-store.js'}
R, ERRS = [], []

def check(name, cond):
    R.append((name, bool(cond)))

def start_server():
    return subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--directory', SITE],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def launch(p):
    ch = os.environ.get('PW_CHANNEL')
    return p.chromium.launch(channel=ch) if ch else p.chromium.launch()

def _fake_sdk(route):
    name = route.request.url.split('/')[-1]
    body = open(os.path.join(HERE, FAKES[name]), encoding='utf-8').read()
    route.fulfill(status=200, content_type='application/javascript', body=body)

def new_ctx(b, scheme='light', vp=(390, 844), sw='block'):
    c = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2, is_mobile=True,
                      has_touch=True, color_scheme=scheme, service_workers=sw)
    c.route(SDK + '**', _fake_sdk)
    return c

def open_app(c):
    pg = c.new_page()
    pg.on('pageerror', lambda e: ERRS.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('#login-form')
    return pg

def login(pg, who='bre'):
    pg.fill('#l-email', ACC[who]); pg.fill('#l-pass', 'correct-horse'); pg.click('#l-btn')
    pg.wait_for_selector('.hero'); pg.wait_for_timeout(150)

def logout(pg):
    pg.evaluate(f"import('{SDK}firebase-auth.js').then(m => m.signOut())")
    pg.wait_for_selector('#login-form')

def st(pg): return pg.evaluate('window.__store')
def expenses(pg): return [v for k, v in st(pg).items() if k.startswith('expenses/')]
def activity(pg): return [dict(v, id=k.split('/')[1]) for k, v in st(pg).items() if k.startswith('activity/')]

def fs_write(pg, path, data):
    pg.evaluate("([sdk, segs, data]) => import(sdk + 'firebase-firestore.js').then(m => m.setDoc(m.doc({}, ...segs), data, {merge: true}))",
                [SDK, path.split('/'), data])
    pg.wait_for_timeout(100)

# ---- Flow helpers: UI tasks change these bodies, never the suites that call them ----
def start_add(pg): pg.click('[data-act=add]'); pg.wait_for_timeout(30)
def keys(pg, s):
    for ch in s: pg.click(f'[data-act=key][data-k="{ch}"]')
def current_payer(pg): return 'kyle' if 'Kyle' in pg.inner_text('.payer') else 'bre'
def set_payer(pg, who):
    if current_payer(pg) != who: pg.click('[data-act=toggle-payer]')
def next_step(pg): pg.click('[data-act=next]'); pg.wait_for_timeout(30)
def save_at_store(pg, store_id): pg.click(f'[data-act=store][data-id="{store_id}"]'); pg.wait_for_timeout(100)
def save_new_store(pg, name, category):
    pg.fill('#w-q', name); pg.wait_for_timeout(50); pg.click('[data-act=new-store]'); pg.wait_for_timeout(50)
    pg.click(f'[data-act=new-cat][data-c="{category}"]'); pg.wait_for_timeout(100)
def open_details(pg): pg.click('[data-act=toggle-opts]')
def set_split(pg, v): pg.click(f'[data-act=o-split][data-v={v}]')
def go_home(pg): pg.click('[data-act=home]'); pg.wait_for_timeout(50)
def open_history(pg): pg.click('[data-act=history]'); pg.wait_for_timeout(50)
def open_account(pg): open_history(pg)
def leave_account(pg): go_home(pg)
```

- [ ] **Step 4: Create `test/suite_core.py`** (the original 24 checks, using the helpers)

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c)
    pg.fill('#l-email', ACC['bre']); pg.fill('#l-pass', 'wrong'); pg.click('#l-btn'); pg.wait_for_timeout(150)
    check('wrong password shows error', pg.is_visible('#l-err'))
    pg.fill('#l-pass', 'correct-horse'); pg.click('#l-btn'); pg.wait_for_selector('.hero'); pg.wait_for_timeout(200)
    s = st(pg)
    check('seeded 6 bills', len([k for k in s if k.startswith('bills/')]) == 6)
    check('seeded 23 stores', len([k for k in s if k.startswith('merchants/')]) == 23)
    check('no Trade Coffee', not any(k.endswith('trade-coffee') or k == 'merchants/trade' for k in s))
    # happy path
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    e = expenses(pg)
    check('happy path saved Costco 4512 by Bre half', len(e) == 1 and e[0]['amountCents'] == 4512 and e[0]['payer'] == 'bre'
          and e[0]['split'] == 'half' and e[0]['category'] == 'Groceries')
    # empty amount
    start_add(pg); next_step(pg); check('empty amount error', pg.is_visible('#amt-err'))
    # undo
    keys(pg, '10'); next_step(pg); save_at_store(pg, 'target')
    pg.click('#toast [data-toast="0"]'); pg.wait_for_timeout(80)
    check('undo removed it', len(expenses(pg)) == 1)
    # bill
    start_add(pg); pg.click('[data-act=bill][data-id=electricity]'); pg.wait_for_timeout(50); next_step(pg); pg.wait_for_timeout(80)
    el = [x for x in expenses(pg) if x['merchant'] == 'Electricity']
    check('bill saved as Kyle 64555 w/ billId', el and el[0]['payer'] == 'kyle' and el[0]['amountCents'] == 64555 and el[0]['billId'] == 'electricity')
    # new store
    start_add(pg); keys(pg, '20'); next_step(pg); save_new_store(pg, 'Lazy Dog', 'Dining & takeout')
    check('new store learned', 'merchants/lazy-dog' in st(pg) and st(pg)['merchants/lazy-dog']['category'] == 'Dining & takeout')
    # options: Kyle, owed in full, back-dated
    start_add(pg); keys(pg, '400'); set_payer(pg, 'kyle'); next_step(pg)
    open_details(pg); set_split(pg, 'full'); pg.fill('#o-date', '2026-10-01'); pg.fill('#o-note', 'Camera')
    save_at_store(pg, 'target')
    cam = [x for x in expenses(pg) if x.get('note') == 'Camera']
    check('options applied', cam and cam[0]['split'] == 'full' and cam[0]['payer'] == 'kyle' and cam[0]['date'] == '2026-10-01')
    pg.wait_for_timeout(100)
    check('balance $690.22', pg.inner_text('.hero .amt') == '$690.22' and pg.inner_text('.hero .who') == 'Bre owes Kyle')
    # edit
    lid = [k for k, v in st(pg).items() if k.startswith('expenses/') and v['merchant'] == 'Lazy Dog'][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{lid}"]'); pg.fill('#e-amt', '25'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    check('edit updated balance $687.72', pg.inner_text('.hero .amt') == '$687.72')
    # settle
    pg.click('[data-act=settle]'); pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
    check('after settle even', pg.inner_text('.hero .amt') == '$0.00')
    sets = [v for k, v in st(pg).items() if k.startswith('settlements/')]
    check('settlement record', len(sets) == 1 and sets[0]['amountCents'] == 68772 and sets[0]['count'] == 4 and sets[0]['from'] == 'bre')
    open_history(pg); pg.click('[data-act=detail]'); pg.wait_for_timeout(150)
    check('detail lists 4', pg.locator('#d-list .row').count() == 4)
    pg.click('[data-act=close]'); go_home(pg)
    open_account(pg); pg.click('[data-act=reset-pass]'); pg.wait_for_timeout(50)
    check('reset email to own address', pg.evaluate('window.__resetSent') == ACC['bre'])
    leave_account(pg)
    # permission denied
    pg.evaluate('window.__deny=true'); start_add(pg); keys(pg, '5'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(50)
    check('denied write message', 'security rules' in pg.inner_text('#toast'))
    pg.evaluate('window.__deny=false')
    check('no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
    # sign out, stranger, Kyle
    open_account(pg); pg.click('[data-act=signout]'); pg.wait_for_selector('#login-form')
    pg.fill('#l-email', ACC['stranger']); pg.fill('#l-pass', 'correct-horse'); pg.click('#l-btn'); pg.wait_for_timeout(150)
    check('stranger denied', 'Not set up' in pg.inner_text('#app'))
    pg.click('[data-act=signout]'); pg.wait_for_selector('#login-form')
    login(pg, 'kyle_messy')
    start_add(pg); check('Kyle defaults to Kyle', current_payer(pg) == 'kyle')
    c.close()
    # dark + small phone
    c = new_ctx(b, 'dark', (375, 667)); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '12.5')
    box = pg.locator('[data-act=next]').bounding_box()
    check('Next button fully on small screen', box['y'] + box['height'] <= 667)
    next_step(pg); c.close()
    # service worker
    c = new_ctx(b, sw='allow'); pg = c.new_page(); pg.goto(URL); pg.wait_for_timeout(1500)
    check('service worker active', pg.evaluate('navigator.serviceWorker.ready.then(r=>!!r.active)'))
    import re
    cache_name = re.search(r'const CACHE = "([^"]+)"', open(os.path.join(SITE, 'sw.js'), encoding='utf-8').read()).group(1)
    check('shell cached', pg.evaluate(f'caches.open("{cache_name}").then(c=>c.keys()).then(k=>k.length)') >= 8)
    c.close()
```

- [ ] **Step 5: Rewrite `test/run.py`**

```python
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from harness import R, ERRS, check, start_server, launch
import suite_core

SUITES = [suite_core]

srv = start_server(); time.sleep(1)
try:
    with sync_playwright() as p:
        b = launch(p)
        for s in SUITES:
            try: s.run(b)
            except Exception as e: check(f'{s.__name__} crashed: {e!r}', False)
        b.close()
finally:
    srv.terminate()
check('no page errors', not ERRS)
if ERRS: print('errors', ERRS)
for n, ok in R: print('PASS' if ok else 'FAIL', n)
print(f"{sum(ok for _, ok in R)}/{len(R)} passed")
sys.exit(0 if all(ok for _, ok in R) else 1)
```

- [ ] **Step 6: Install the test dependencies and the browser**

Run: `python -m pip install playwright axe-playwright-python` and then `python -m playwright install chromium`
If the browser install fails, use `PW_CHANNEL=msedge` for every test run.

- [ ] **Step 7: Run the tests**

Run: `python test/run.py` (or `PW_CHANNEL=msedge python test/run.py`)
Expected: `24/24 passed` (23 checks in `suite_core` plus "no page errors" from `run.py`).

- [ ] **Step 8: Check for emails, then commit**

Run: `git add .gitignore test` and then `git status --short test/`. The list shows `harness.py`, `run.py`, `suite_core.py`, and the `fb-*.js` fakes, and **not** `accounts.local.json`.
Run: `git grep -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}"` → must print nothing.
```bash
git commit -m "Split tests into suites; keep test emails in an untracked file"
```

---

### Task 2: `ui.js`: layers, focus, inert, announcer, titles, persistent toast

**Files:**
- Create: `ui.js`, `test/suite_layers.py`
- Modify: `app.js` (remove `esc`, `toast`, `openLayer`, `closeLayer`, `closeLayerSilently`; use `ui.js`), `index.html:150-152`, `sw.js:3-4`, `test/run.py` (`SUITES`)

**Interfaces:**
- Produces (`ui.js`):
  - `esc(s) -> string`
  - `openLayer(html: string, opts?: { opener?: Element }) -> void`. `html` must contain `<h1 id="layer-title">`
  - `closeLayer(after?: () => void) -> void`. Runs `after()` (usually `render`), then restores focus to the opener, or else to `#app h1`
  - `resetLayer() -> void`. Closes without touching focus (used on sign-in/out)
  - `keepFocus(fn: () => void, fallbackSel?: string) -> void`
  - `announce(text: string) -> void`
  - `setTitle(screen: string | null) -> void`. Sets `"<screen> · Expenses"`, or `"Expenses"` for null
  - `toast(msg: string, actions?: {label: string, run: () => void}[]) -> void`
  - `hideToast() -> void`
- Produces (`app.js`): `closeScreen()`, which replaces every former `closeLayer()` call. `S.layer: null | "add" | "edit" | "settle" | "detail" | "profile"`

- [ ] **Step 1: Write the failing test `test/suite_layers.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('layers: home title', pg.title() == 'Expenses')
    check('layers: #app not a live region', pg.evaluate("document.getElementById('app').getAttribute('aria-live')") is None)
    check('layers: announcer exists', pg.evaluate("(document.getElementById('announcer')||{}).getAttribute?.('aria-live')") == 'polite')
    start_add(pg)
    check('layers: focus moves to title', pg.evaluate('document.activeElement.id') == 'layer-title')
    check('layers: dialog named by title', pg.evaluate("document.getElementById('layer').getAttribute('aria-labelledby')") == 'layer-title')
    check('layers: home inert while open', pg.evaluate("document.getElementById('app').inert") is True)
    check('layers: page title follows screen', pg.title() == 'Add expense · Expenses')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(50)
    check('layers: focus returns to opener', pg.evaluate('document.activeElement.dataset.act') == 'add')
    check('layers: home not inert after close', pg.evaluate("document.getElementById('app').inert") is False)
    # focus survives a data refresh after saving
    start_add(pg); keys(pg, '5'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(250)
    check('layers: focus kept on Add after data refresh', pg.evaluate('document.activeElement.dataset.act') == 'add')
    # toast: persistent with actions, dismissible, hidden when a layer opens
    check('toast: has Dismiss', pg.locator('#toast [aria-label=Dismiss]').count() == 1)
    pg.wait_for_timeout(10000)
    check('toast: still visible after 10s', pg.is_visible('#toast'))
    pg.click('#toast [aria-label=Dismiss]')
    check('toast: Dismiss hides it', not pg.is_visible('#toast'))
    start_add(pg); keys(pg, '6'); next_step(pg); save_at_store(pg, 'costco')
    start_add(pg)
    check('toast: hidden when a screen opens', not pg.is_visible('#toast'))
    c.close()
```
Add `suite_layers` to `SUITES` in `test/run.py`: `import suite_core, suite_layers` and `SUITES = [suite_core, suite_layers]`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on `layers: home title`, `announcer exists`, `focus moves to title`, `toast: has Dismiss`, and others.

- [ ] **Step 3: Create `ui.js`**

```js
// Accessibility plumbing shared by every screen: layers, focus, announcements, toasts, titles.
export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $id = id => document.getElementById(id);

// A stable way to find "the same control" after a re-render replaces the DOM.
function keyOf(el) {
  if (!el || el === document.body || !el.tagName) return null;
  if (el.id) return "#" + CSS.escape(el.id);
  if (el.tagName === "INPUT" && el.name) return `input[name="${CSS.escape(el.name)}"][value="${CSS.escape(el.value)}"]`;
  if (el.dataset && el.dataset.act) return `[data-act="${CSS.escape(el.dataset.act)}"]`
    + (el.dataset.id ? `[data-id="${CSS.escape(el.dataset.id)}"]` : "") + (el.dataset.k ? `[data-k="${CSS.escape(el.dataset.k)}"]` : "");
  return null;
}
export function keepFocus(fn, fallbackSel) {
  const k = keyOf(document.activeElement);
  fn();
  const lost = !document.activeElement || document.activeElement === document.body;
  if (k && lost) {
    const el = document.querySelector(k) || (fallbackSel && document.querySelector(fallbackSel));
    if (el) { if (el.tagName === "H1") el.tabIndex = -1; el.focus({ preventScroll: true }); }
  }
}

export function setTitle(screen) { document.title = screen ? `${screen} · Expenses` : "Expenses"; }

let opener = null, lastTitle = "";
export function openLayer(html, opts = {}) {
  const l = $id("layer"), wasHidden = l.hidden, prevTitle = lastTitle;
  if (wasHidden) { opener = keyOf(opts.opener || document.activeElement); hideToast(); }
  keepFocus(() => { l.innerHTML = html; });
  l.hidden = false; l.setAttribute("aria-labelledby", "layer-title");
  $id("app").inert = true;
  const t = $id("layer-title"); lastTitle = t ? t.textContent.trim() : "";
  setTitle(lastTitle);
  if (t && (wasHidden || lastTitle !== prevTitle || !l.contains(document.activeElement))) { t.tabIndex = -1; t.focus(); }
}
export function resetLayer() {
  const l = $id("layer"); l.hidden = true; l.innerHTML = ""; l.removeAttribute("aria-labelledby");
  $id("app").inert = false; lastTitle = ""; opener = null;
}
export function closeLayer(after) {
  const k = opener; resetLayer();
  if (after) after();
  const el = (k && document.querySelector(k)) || document.querySelector("#app h1");
  if (el) { if (el.tagName === "H1") el.tabIndex = -1; el.focus({ preventScroll: true }); }
}

let annTimer;
export function announce(text) {
  const a = $id("announcer"); if (!a) return;
  a.textContent = ""; clearTimeout(annTimer);
  annTimer = setTimeout(() => { a.textContent = text; }, 50);
}

let toastTimer;
export function hideToast() { clearTimeout(toastTimer); const t = $id("toast"); if (t) { t.hidden = true; t.innerHTML = ""; } }
// Toasts with actions (Undo, Edit) stay until dismissed: WCAG 2.2.1 Timing adjustable.
export function toast(msg, actions = []) {
  const t = $id("toast");
  t.innerHTML = `<span>${esc(msg)}</span>`
    + actions.map((a, i) => `<button type="button" data-toast="${i}">${esc(a.label)}</button>`).join("")
    + (actions.length ? `<button type="button" data-toast="x" class="x" aria-label="Dismiss">✕</button>` : "");
  t.hidden = false;
  t.onclick = ev => {
    const b = ev.target.closest("[data-toast]"); if (!b) return;
    hideToast(); if (b.dataset.toast !== "x") actions[+b.dataset.toast].run();
  };
  clearTimeout(toastTimer);
  if (!actions.length) toastTimer = setTimeout(hideToast, 4000);
}
```

- [ ] **Step 4: Update `index.html` body**

Replace lines 150–152 with:
```html
<div id="app"><div class="frame"><div class="scroll"><p class="muted" style="padding-top:40vh;text-align:center">Loading…</p></div></div></div>
<div id="layer" class="layer" hidden role="dialog" aria-modal="true"></div>
<div id="toast" class="toast" role="status" hidden></div>
<div id="announcer" class="sr" aria-live="polite"></div>
```
Add to the toast CSS: `.toast button.x{text-decoration:none;font-size:18px;min-width:44px}`.

- [ ] **Step 5: Wire `app.js` to `ui.js`**

1. At the top, after the Firebase imports:
```js
import { esc, openLayer, closeLayer, resetLayer, keepFocus, announce, setTitle, toast, hideToast } from "./ui.js";
```
2. Delete app.js's own `esc` (line 54), the whole Toast section (lines 83–95), `openLayer`/`closeLayer` (lines 226–227), and `closeLayerSilently` (line 582).
3. Add `layer: null` to the `S` object, and add after the deleted layer helpers:
```js
function closeScreen() { A.step = null; S.layer = null; closeLayer(render); }
```
4. Replace every `closeLayer()` call in app.js with `closeScreen()`. These are in `saveNew`, `saveEdit`, `deleteEdit`, `settleGo`, the `"close"` click case, and the Escape key handler.
5. Set `S.layer` at the top of `startAdd` (`"add"`), `openEdit` (`"edit"`), `openSettle` (`"settle"`), and `openDetail` (`"detail"`).
6. Give each layer's `<h1>` the id: `<h1 id="layer-title">`. That's in `renderAmount`, `renderWhere`, `openEdit`, `openSettle`, and `openDetail`.
7. Replace `render()` with:
```js
function render() {
  const root = $("#app");
  keepFocus(() => {
    if (S.view === "login") { root.innerHTML = loginHTML(); setTitle("Sign in"); return; }
    if (S.view === "denied") { root.innerHTML = deniedHTML(); setTitle("Not set up"); return; }
    if (S.view === "history") { root.innerHTML = historyHTML(); setTitle("History"); return; }
    const scroller = root.querySelector(".scroll"), top = scroller ? scroller.scrollTop : 0;
    root.innerHTML = homeHTML(); if ($("#layer").hidden) setTitle(null);
    const ns = root.querySelector(".scroll"); if (ns) ns.scrollTop = top;
  }, "#app h1");
  if (!$("#layer").hidden) setTitle(($("#layer-title") || {}).textContent || null);
}
```
8. In `onAuthStateChanged`, replace `closeLayerSilently();` with `resetLayer(); hideToast(); S.layer = null; A.step = null;`.

- [ ] **Step 6: Add the new files to the offline list in `sw.js`**

```js
const SHELL = ["./", "./index.html", "./app.js", "./ui.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/icon-maskable-512.png"];
```

- [ ] **Step 7: Run tests**

Run: `python test/run.py`
Expected: all PASS (core and layers).

- [ ] **Step 8: Commit**

```bash
git add ui.js app.js index.html sw.js test/suite_layers.py test/run.py
git commit -m "Add ui.js: named layers with focus management, announcer, persistent undo toast"
```

---

### Task 3: `copy.js` and the warm, second-person voice

**Files:**
- Create: `copy.js`, `test/suite_voice.py`
- Modify: `app.js` (imports; remove the formatters now in `copy.js`; `homeHTML`, `saveNew` toasts, other toasts), `index.html` (hero `.sub`, header), `sw.js` SHELL, `test/suite_core.py` (balance wording)

**Interfaces:**
- Produces (`copy.js`):
  - `fmt(cents) -> "$1,234.56"`, `iso(Date)`, `todayISO()`, `parseISO(s) -> Date`, `shortDate(s)`, `longDate(s)`, `dayLabel(s)`, `timeOf(ms) -> "3:42 PM"`, `daysBetween(fromISO, toISO) -> int`
  - `greeting(name, hour) -> string`
  - `balanceLine(net, me, names) -> { who, sub }`
  - `sinceLine(count, lastISO|null, daysAgo) -> string`
  - `savedLine(amountStr, merchant, bill?: {name, overUsual: string|null}) -> string`
  - `C`: a strings object (keys below; later tasks add keys)

- [ ] **Step 1: Write the failing test `test/suite_voice.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    h1 = pg.inner_text('#app h1')
    check('voice: greeting', h1 in ('Good morning, Bre', 'Good afternoon, Bre', 'Good evening, Bre'))
    check('voice: even line', pg.inner_text('.hero .who') == 'You’re even' and pg.inner_text('.hero .sub') == 'All square.')
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('voice: saved toast', pg.inner_text('#toast span') == 'Got it. $45.12 at Costco.')
    pg.wait_for_timeout(100)
    check('voice: Kyle owes you (Bre paid)', pg.inner_text('.hero .who') == 'Kyle owes you')
    check('voice: legend says You paid', 'You paid $45.12' in pg.inner_text('.legend'))
    check('voice: since line, no settle', pg.inner_text('.since') == '1 expense so far')
    logout(pg); login(pg, 'kyle')
    check('voice: You owe Bre (Kyle viewing)', pg.inner_text('.hero .who') == 'You owe Bre')
    c.close()
    # pure functions
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => [
      m.greeting('Bre', 4), m.greeting('Bre', 5), m.greeting('Bre', 12), m.greeting('Bre', 17),
      m.sinceLine(6, '2026-09-01', 32), m.sinceLine(1, '2026-09-01', 0), m.sinceLine(2, '2026-09-01', 1), m.sinceLine(0, null, 0),
      m.savedLine('$780.00', 'Electricity', {name: 'Electricity', overUsual: '$645.55'}), m.savedLine('$80.00', 'Internet', {name: 'Internet', overUsual: null})])""")
    check('voice: greeting boundaries', r[:4] == ['Good evening, Bre', 'Good morning, Bre', 'Good afternoon, Bre', 'Good evening, Bre'])
    check('voice: since with days', r[4] == '6 expenses since you settled on Sep 1, 32 days ago')
    check('voice: since today / 1 day', r[5].endswith('settled on Sep 1, today') and r[6].endswith('1 day ago'))
    check('voice: nothing yet', r[7] == 'No expenses yet')
    check('voice: bill over usual', r[8] == 'Got it. $780.00 for Electricity. That’s more than the usual $645.55.')
    check('voice: bill normal', r[9] == 'Got it. $80.00 for Internet.')
    c.close()
```
Add `suite_voice` to `SUITES`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `voice:` checks (and `copy.js` 404s).

- [ ] **Step 3: Create `copy.js`**

```js
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
```

- [ ] **Step 4: Use `copy.js` in `app.js`**

1. Add the import:
```js
import { fmt, iso, todayISO, parseISO, daysBetween, shortDate, longDate, dayLabel, timeOf, greeting, balanceLine, sinceLine, savedLine, C } from "./copy.js";
```
2. Delete app.js's own `fmt`, `pad`, `iso`, `todayISO`, `parseISO`, `shortDate`, `longDate`, and `dayLabel` (lines 55–69).
3. In `writeFailed`, use `C.cantChange` / `C.cantSave`. In `subscribe`'s `err`, use `C.cantRead`. In `syncLabel`, use `C.offline` / `C.syncing`. For `reset-pass`, use `C.resetSent` / `C.resetFailed`.
4. Replace `homeHTML()` with:
```js
function homeHTML() {
  const list = sortExp(S.expenses), t = calc(list), bl = balanceLine(t.net, S.me, PEOPLE), amt = fmt(Math.abs(t.net));
  const last = S.settlements[0], them = other(S.me);
  const mine = S.me === "kyle" ? t.kyleHalf + t.kyleFull : t.breHalf + t.breFull;
  const theirs = S.me === "kyle" ? t.breHalf + t.breFull : t.kyleHalf + t.kyleFull;
  const tot = mine + theirs, myPct = tot ? mine / tot * 100 : 50;
  let rows = "";
  if (!S.loaded) rows = `<p class="muted">Loading expenses…</p>`;
  else if (!list.length) rows = `<div class="card empty"><h2>${esc(C.emptyTitle)}</h2><p class="muted" style="margin:0">${esc(C.emptyBody)}</p></div>`;
  else {
    let cur = null;
    for (const e of list) {
      if (e.date !== cur) { if (cur !== null) rows += `</div></section>`; cur = e.date; rows += `<section class="group"><h2>${esc(dayLabel(e.date))}</h2><div class="rows">`; }
      rows += rowHTML(e, true);
    }
    rows += `</div></section>`;
  }
  const since = sinceLine(list.length, last ? last.date : null, last ? daysBetween(last.date, todayISO()) : 0);
  return `<div class="frame">
    <header class="top"><div class="inner hdr">
      <div class="hello"><h1>${esc(greeting(PEOPLE[S.me], new Date().getHours()))}</h1><span class="sync" id="sync">${esc(syncLabel())}</span></div>
      <button class="link" data-act="history">History</button></div></header>
    <div class="scroll"><div class="inner">
      ${installHint()}
      <section class="hero" aria-label="Current balance">
        <p class="who">${esc(bl.who)}</p><p class="amt">${amt}</p>${bl.sub ? `<p class="sub">${esc(bl.sub)}</p>` : ""}
        <div class="bar" role="img" aria-label="You paid ${fmt(mine)}, ${esc(PEOPLE[them])} paid ${fmt(theirs)}">
          <span style="width:${myPct}%;background:var(--${S.me})"></span><span style="width:${100 - myPct}%;background:var(--${them})"></span></div>
        <div class="legend"><span><span class="dot" style="background:var(--${S.me})"></span>You paid ${fmt(mine)}</span>
          <span><span class="dot" style="background:var(--${them})"></span>${esc(PEOPLE[them])} paid ${fmt(theirs)}</span></div>
        <p class="since">${esc(since)}</p>
        ${list.length ? `<button class="btn" style="width:100%;margin-top:14px" data-act="settle">Settle up</button>` : ""}
      </section>
      ${rows}
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn primary" data-act="add">Add expense</button></div></footer>
  </div>`;
}
```
5. In `saveNew`, replace the `over`/`toast` lines with:
```js
  const over = bill && bill.usualCents && A.cents > bill.usualCents * 1.2 ? fmt(bill.usualCents) : null;
  toast(savedLine(fmt(data.amountCents), data.merchant, bill ? { name: bill.name, overUsual: over } : null), [
    { label: "Undo", run: () => { deleteDoc(ref).catch(writeFailed); toast(C.removed); } },
    { label: "Edit", run: () => openEdit(Object.assign({ id: ref.id }, data)) }
  ]);
```
6. Replace the toast strings: `toast("Changes saved")` → `toast(C.changesSaved)`, `toast("Expense deleted")` → `toast(C.deleted)`, `toast("Settled. Fresh balance started.")` → `toast(C.settled)`.

- [ ] **Step 5: CSS in `index.html`**

Add after the `.hero .amt` rule:
```css
.hero .sub{margin:-8px 0 14px;color:var(--muted)}
.hdr{display:flex;align-items:center;gap:12px}
.hello{flex:1;min-width:0;display:flex;flex-direction:column}
.hello h1{font-size:20px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
```
The `.top h1` rule already sets 17px. `.hello h1` (0,1,1) appears later with equal specificity, so it wins.

- [ ] **Step 6: Update `sw.js` SHELL** to include `"./copy.js"` after `"./ui.js"`.

- [ ] **Step 7: Update the expected wording in `test/suite_core.py`**

Change `pg.inner_text('.hero .who') == 'Bre owes Kyle'` to `pg.inner_text('.hero .who') == 'You owe Kyle'`. Bre is the viewer there.

- [ ] **Step 8: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add copy.js app.js index.html sw.js test/suite_voice.py test/suite_core.py test/run.py
git commit -m "Move all wording into copy.js; warm second-person voice on home"
```

---

### Task 4: Activity log writes, with Undo leaving no trace, and the rules

**Files:**
- Create: `test/suite_activity.py`
- Modify: `app.js` (`saveNew`, the Undo action, `openEdit`, `saveEdit`, `deleteEdit`, `settleGo`; new `logEntry`, `summaryOf`, `EDIT_FIELDS`), `firebase-only/firestore.rules`, `C` in `copy.js` (`noChanges`)

**Interfaces:**
- Consumes: `toast`, `C`, `fmt`, `savedLine`
- Produces:
  - Firestore `activity/{id}` docs: `{ at, by, action: "add"|"edit"|"delete"|"settle", expenseId, settlementId, summary, changes }`
  - Add entries have the ID `add-{expenseId}`
  - `summary`: add/delete → `{amountCents, merchant, payer}` of the expense; edit → the same, taken from the expense *before* the edit; settle → `{amountCents, from, to}`
  - `changes`: edit only, `[{field, from, to}]` for fields in `EDIT_FIELDS` whose values differ
  - `E.orig`: the expense as it was when Edit opened

- [ ] **Step 1: Write the failing test `test/suite_activity.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    a = activity(pg)
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    check('activity: add entry with fixed id', len(a) == 1 and a[0]['id'] == f'add-{eid}' and a[0]['action'] == 'add'
          and a[0]['by'] == 'bre' and a[0]['summary'] == {'amountCents': 4512, 'merchant': 'Costco', 'payer': 'bre'})
    # Undo erases both the expense and its add entry
    start_add(pg); keys(pg, '10'); next_step(pg); save_at_store(pg, 'target')
    check('activity: second add logged', len(activity(pg)) == 2)
    pg.click('#toast [data-toast="0"]'); pg.wait_for_timeout(100)
    a = activity(pg)
    check('activity: undo leaves no trace', len(a) == 1 and a[0]['summary']['merchant'] == 'Costco'
          and not any(x['action'] == 'undo' for x in a))
    # Edit logs only changed fields, summary from before the edit
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.fill('#e-amt', '25'); pg.fill('#e-store', 'Target'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    ed = [x for x in activity(pg) if x['action'] == 'edit']
    check('activity: edit entry', len(ed) == 1 and ed[0]['expenseId'] == eid and ed[0]['summary']['merchant'] == 'Costco'
          and ed[0]['changes'] == [{'field': 'amountCents', 'from': 4512, 'to': 2500}, {'field': 'merchant', 'from': 'Costco', 'to': 'Target'}])
    # Edit with no changes writes nothing (Review Focus 4)
    before = len(activity(pg)); upd = st(pg)[f'expenses/{eid}']['updatedAt']
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    check('activity: no-change edit logs nothing', len(activity(pg)) == before and st(pg)[f'expenses/{eid}']['updatedAt'] == upd)
    check('activity: no-change edit says so', pg.inner_text('#toast span') == 'Nothing changed.')
    # Delete
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.click('[data-act=e-delete]'); pg.click('[data-act=e-delete]'); pg.wait_for_timeout(100)
    de = [x for x in activity(pg) if x['action'] == 'delete']
    check('activity: delete entry keeps a copy', len(de) == 1 and de[0]['summary'] == {'amountCents': 2500, 'merchant': 'Target', 'payer': 'bre'})
    check('activity: add entry survives a delete', any(x['id'] == f'add-{eid}' for x in activity(pg)))
    # Settle
    start_add(pg); keys(pg, '30'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('[data-act=settle]'); pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
    se = [x for x in activity(pg) if x['action'] == 'settle']
    sid = [k for k in st(pg) if k.startswith('settlements/')][0].split('/')[1]
    check('activity: settle entry', len(se) == 1 and se[0]['settlementId'] == sid
          and se[0]['summary'] == {'amountCents': 1500, 'from': 'kyle', 'to': 'bre'})
    c.close()
```
Add `suite_activity` to `SUITES`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `activity:` checks (no `activity/` docs).

- [ ] **Step 3: Implement in `app.js`**

Add after `writeFailed`:
```js
/* ---------------- Activity log ---------------- */
// One entry per add, edit, delete, or settle-up, written in the same batch as the change.
// Undo removes the expense and its "add-{id}" entry together, so a corrected mistake leaves no trace.
const EDIT_FIELDS = ["amountCents", "payer", "merchant", "category", "date", "split", "note", "covers"];
const summaryOf = e => ({ amountCents: e.amountCents, merchant: e.merchant, payer: e.payer });
function logEntry(b, entry, id) {
  const ref = id ? doc(db, "activity", id) : doc(collection(db, "activity"));
  b.set(ref, Object.assign({ at: Date.now(), by: S.me, expenseId: null, settlementId: null, summary: null, changes: [] }, entry));
}
```
In `saveNew`, replace `setDoc(ref, data).catch(writeFailed);` with:
```js
  const batch = writeBatch(db);
  batch.set(ref, data);
  logEntry(batch, { action: "add", expenseId: ref.id, summary: summaryOf(data) }, `add-${ref.id}`);
  batch.commit().catch(writeFailed);
```
and replace the Undo action with:
```js
    { label: "Undo", run: () => { const u = writeBatch(db); u.delete(ref); u.delete(doc(db, "activity", `add-${ref.id}`)); u.commit().catch(writeFailed); toast(C.removed); } },
```
In `openEdit`, change the `Object.assign(E, …)` line to also store the original:
```js
  Object.assign(E, { id: e.id, payer: e.payer, split: e.split || "half", confirmDel: false, orig: Object.assign({}, e) });
```
In `saveEdit`, replace `updateDoc(doc(db, "expenses", E.id), data).catch(writeFailed);` and the line after it with:
```js
  const changes = EDIT_FIELDS.filter(f => (E.orig[f] ?? "") !== (data[f] ?? ""))
    .map(f => ({ field: f, from: E.orig[f] ?? "", to: data[f] ?? "" }));
  if (!changes.length) { closeScreen(); toast(C.noChanges); return; }
  const batch = writeBatch(db);
  batch.update(doc(db, "expenses", E.id), data);
  logEntry(batch, { action: "edit", expenseId: E.id, summary: summaryOf(E.orig), changes });
  batch.commit().catch(writeFailed);
  closeScreen(); toast(C.changesSaved);
```
In `deleteEdit`, replace `deleteDoc(doc(db, "expenses", E.id)).catch(writeFailed);` with:
```js
  const batch = writeBatch(db);
  batch.delete(doc(db, "expenses", E.id));
  logEntry(batch, { action: "delete", expenseId: E.id, summary: summaryOf(E.orig) });
  batch.commit().catch(writeFailed);
```
In `settleGo`, change the `ops` line to include the log entry in the first batch:
```js
  const ops = [b => b.set(sref, rec),
    b => logEntry(b, { action: "settle", settlementId: sref.id, summary: { amountCents: rec.amountCents, from: rec.from, to: rec.to } }),
    ...list.map(e => b => b.update(doc(db, "expenses", e.id), { settled: true, settlementId: sref.id }))];
```
Add to `C` in `copy.js`: `noChanges: "Nothing changed.",`

Now that nothing in `app.js` calls `deleteDoc` or `updateDoc` directly, remove them from the Firestore import list.

- [ ] **Step 4: Update `firebase-only/firestore.rules`** (gitignored; don't commit)

Insert before `// Everything else is closed by default.`:
```
    // Activity log: append-only, except Undo may remove an "add" entry
    // in the same save that deletes its expense.
    match /activity/{id} {
      allow read: if isMember();
      allow create: if isMember()
        && request.resource.data.by in ['bre', 'kyle']
        && request.resource.data.action in ['add', 'edit', 'delete', 'settle'];
      allow update: if false;
      allow delete: if isMember() && resource.data.action == 'add'
        && !existsAfter(/databases/$(database)/documents/expenses/$(resource.data.expenseId));
    }
```

- [ ] **Step 5: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 6: Commit** (the rules file stays untracked)

```bash
git add app.js copy.js test/suite_activity.py test/run.py
git commit -m "Log adds, edits, deletes, and settle-ups; undo leaves no trace"
```

---

### Task 5: Add expense, step 1 (amount)

**Files:**
- Create: `test/suite_add.py`
- Modify: `app.js` (`renderAmount`, `pressKey`, change events, new `payerFieldset`, `nextLabel`, `announceAmount`), `index.html` CSS, `test/harness.py` (`current_payer`, `set_payer`)

**Interfaces:**
- Consumes: `openLayer`, `announce`, `esc`, `fmt`
- Produces:
  - `payerFieldset(name: string, value: "bre"|"kyle") -> html`: radios `name=<name>`, values `bre`/`kyle`, "You" first
  - CSS classes `.fs`, `.segr`, `.title-lg`, `.step`, `.amt-label`, `.tall` (used by later tasks)
  - The step 1 Next button keeps `data-act="next"`. The payer radios are `input[name=payer]`

- [ ] **Step 1: Write the failing test `test/suite_add.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg)
    check('add1: big title', pg.evaluate("parseFloat(getComputedStyle(document.getElementById('layer-title')).fontSize)") >= 26)
    check('add1: step marker', pg.inner_text('#layer .step') == 'Step 1 of 2')
    check('add1: visible Amount label', pg.is_visible('#amt-label') and pg.inner_text('#amt-label') == 'Amount')
    check('add1: amount group labelled', pg.evaluate("document.querySelector('[aria-labelledby=amt-label]') !== null"))
    check('add1: hint', pg.inner_text('#amt-hint') == 'Type it in, or pick a bill.')
    check('add1: paid-by legend', pg.inner_text('#payer-set legend') == 'Paid by')
    check('add1: You first and checked', pg.evaluate("[...document.querySelectorAll('input[name=payer]')].map(i => i.value + (i.checked ? '*' : '')).join()") == 'bre*,kyle')
    check('add1: Bills heading', pg.inner_text('#bills-h') == 'Bills')
    check('add1: Next label', pg.inner_text('[data-act=next]') == 'Next: choose store')
    pg.check('input[name=payer][value=kyle]'); keys(pg, '12')
    check('add1: payer kept after typing', pg.evaluate("document.querySelector('input[name=payer]:checked').value") == 'kyle')
    pg.click('[data-act=bill][data-id=internet]'); pg.wait_for_timeout(50)
    check('add1: bill label', pg.inner_text('[data-act=next]') == 'Save Internet, $80.00')
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5')   # 80.00 → 80.0 → 80. → 80.5
    check('add1: bill label follows edits', pg.inner_text('[data-act=next]') == 'Save Internet, $80.50')
    pg.wait_for_timeout(700)
    check('add1: amount announced', pg.inner_text('#announcer').startswith('Amount $'))
    pg.keyboard.press('Escape')
    c.close()
    # Review Focus 1: small screen overlap
    c = new_ctx(b, 'light', (375, 667)); pg = open_app(c); login(pg); start_add(pg)
    keys_box = pg.locator('#layer .keys').bounding_box(); dock_box = pg.locator('#layer .dock').bounding_box()
    check('add1: small screen keypad clear of bottom bar', keys_box['y'] + keys_box['height'] <= dock_box['y'] + 1)
    c.close()
```
Add `suite_add` to `SUITES`.


- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `add1:` checks.

- [ ] **Step 3: Implement step 1 in `app.js`**

Replace `renderAmount` with:
```js
function payerFieldset(name, value) {
  const order = [S.me, other(S.me)];
  return `<fieldset class="fs" id="${name}-set"><legend class="label">Paid by</legend><div class="segr">
    ${order.map(p => `<label><input type="radio" name="${name}" value="${p}" ${value === p ? "checked" : ""}><span>${p === S.me ? "You" : esc(PEOPLE[p])}</span></label>`).join("")}
  </div></fieldset>`;
}
function nextLabel() { return A.bill ? `Save ${A.bill.name}, ${fmt(toCents(A.buf || "") || 0)}` : "Next: choose store"; }
function renderAmount() {
  const bills = S.bills.filter(b => b.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Add expense</h1><p class="step">Step 1 of 2</p></div></header>
    <div class="amount-step"><div class="inner">
      <div class="display">
        <div role="group" aria-labelledby="amt-label" aria-describedby="${A.bill ? "" : "amt-hint "}amt-err" class="amt-field">
          <p id="amt-label" class="amt-label">Amount</p>
          <div id="amt">${amountDisplay()}</div>
        </div>
        ${A.bill ? `<div class="billfor">For ${esc(A.bill.name)} <button class="link" data-act="clear-bill">Change</button></div>`
                 : `<p class="help" id="amt-hint">Type it in, or pick a bill.</p>`}
        <p class="err" id="amt-err" hidden></p>
        ${payerFieldset("payer", A.payer)}
      </div>
      ${bills.length && !A.bill ? `<h2 class="label" id="bills-h">Bills</h2>
        <div class="chiprow" role="group" aria-labelledby="bills-h">${bills.map(b => `<button class="chip" data-act="bill" data-id="${esc(b.id)}">${esc(b.name)}<b>${fmt(b.usualCents)}</b></button>`).join("")}</div>` : ""}
      <div class="keys">${keys.map(k => k === "back"
        ? `<button class="key" data-act="key" data-k="back" aria-label="Delete last digit">⌫</button>`
        : `<button class="key" data-act="key" data-k="${k}">${k}</button>`).join("")}</div>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="close">Cancel</button>
      <button class="btn primary grow2" data-act="next">${esc(nextLabel())}</button></div></footer>
  </div>`);
}
let amtTimer;
function announceAmount() { clearTimeout(amtTimer); amtTimer = setTimeout(() => announce("Amount " + $("#amt").textContent.trim()), 500); }
```
At the end of `pressKey`, after `$("#amt-err").hidden = true;`, add:
```js
  if (A.bill) $("[data-act=next]").textContent = nextLabel();
  announceAmount();
```
In `amountNext`, the empty-amount branch becomes:
```js
  if (!c) { const e = $("#amt-err"); e.textContent = "Enter an amount"; e.hidden = false; announce("Enter an amount"); return; }
```
Delete the `"toggle-payer"` click case. Add a document-level change listener, which later tasks extend:
```js
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.name === "payer") A.payer = t.value;
});
```

- [ ] **Step 4: CSS in `index.html`**

Add to the Layer section:
```css
.top.tall{min-height:auto;padding-bottom:10px}
.top .title-lg{font-size:28px;font-weight:700;letter-spacing:-0.01em;line-height:1.15}
.step{margin:2px 0 0;font-size:14px;color:var(--muted)}
.fs{border:0;margin:0;padding:0;min-width:0}
.segr{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:var(--sunk);border-radius:var(--r-sm)}
.segr.three{grid-template-columns:1fr 1fr 1fr}
.segr label{position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:9px;font-weight:500;color:var(--muted);cursor:pointer;text-align:center;padding:0 6px}
.segr input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}
.segr label:has(input:checked){background:var(--surface);color:var(--ink);font-weight:600;box-shadow:0 0 0 1px var(--line)}
.segr label:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.amt-field{display:flex;flex-direction:column;align-items:center;gap:6px}
.amt-label{margin:0;font-size:15px;font-weight:600;color:var(--muted)}
.display .fs{width:100%;max-width:320px}
.display .help{margin:0;text-align:center}
#bills-h{margin:0 0 4px}
.chiprow{-webkit-mask-image:linear-gradient(to right,#000 85%,transparent);mask-image:linear-gradient(to right,#000 85%,transparent)}
.amount-step{overflow-y:auto}
@media (max-height:700px){
  .top .title-lg{font-size:24px}
  .key{min-height:46px}
  .display{gap:6px;min-height:0}
  .big{font-size:clamp(44px,14vw,60px)}
}
```
Change `.big.empty-amt{color:var(--line)}` to `.big.empty-amt{color:var(--muted)}`.

- [ ] **Step 5: Update the harness payer helpers** in `test/harness.py`

```python
def current_payer(pg): return pg.evaluate("document.querySelector('input[name=payer]:checked').value")
def set_payer(pg, who): pg.check(f'input[name=payer][value={who}]')
```

- [ ] **Step 6: Run tests**

Run: `python test/run.py`
Expected: all PASS, including core's "Kyle defaults to Kyle" and "Next button fully on small screen".

- [ ] **Step 7: Commit**

```bash
git add app.js index.html test/harness.py test/suite_add.py test/run.py
git commit -m "Add flow step 1: big title, Amount label, hint, Paid-by choice, Bills heading"
```

---

### Task 6: Add expense, step 2 (where): select, then Save

**Files:**
- Modify: `app.js` (`renderWhere`, `optsSummary`, `optsPanelHTML`, `renderStoreList`; replace `topStores` with `storeList`; new `saveLabel`, `saveWhere`, `splitFieldset`, `NEW`; click/change/input/keydown handlers), `index.html` CSS, `test/harness.py` (`save_at_store`, `save_new_store`, `set_split`), `test/suite_add.py` (append)

**Interfaces:**
- Consumes: `openLayer`, `announce`, `keepFocus`, `payerFieldset` (not here), `.fs`, `.segr`, `.title-lg`, `.step`
- Produces:
  - `splitFieldset(name, value) -> html` (radios `name=<name>`, values `half`/`full`), used again in Task 7
  - Store radios `input[name=store]` with value = merchant id, or `"__new__"` (`NEW`)
  - `#w-cat` select (new-store category), `#w-err`, `#w-save` (`data-act="save-where"`)
  - `A.sel: string|null`, `A.newCat: string`

- [ ] **Step 1: Append failing tests to `test/suite_add.py`** (inside `run(b)`, before the end)

```python
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg)
    check('add2: question title', pg.inner_text('#layer-title') == 'Where was it?' and pg.inner_text('#layer .step') == 'Step 2 of 2')
    check('add2: context line', '$45.12, paid by you' in pg.inner_text('#layer .ctx'))
    check('add2: visible Store label', pg.is_visible('label[for=w-q]') and pg.inner_text('label[for=w-q]') == 'Store')
    names = pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.closest('label').querySelector('span').firstChild.textContent)")
    check('add2: all stores A–Z', len(names) == 23 and names == sorted(names, key=str.lower))
    check('add2: Save waits for a store', pg.inner_text('#w-save') == 'Choose a store')
    pg.click('#w-save')
    check('add2: pick-a-store error', pg.is_visible('#w-err') and pg.inner_text('#w-err') == 'Pick a store first' and len(expenses(pg)) == 0)
    pg.check('input[name=store][value=costco]')
    check('add2: selecting does not save', len(expenses(pg)) == 0 and not pg.is_visible('#w-err'))
    check('add2: Save names the store', pg.inner_text('#w-save') == 'Save $45.12 at Costco')
    # Review Focus 2: filtering out the selection clears it
    pg.fill('#w-q', 'tar'); pg.wait_for_timeout(50)
    check('add2: filter A–Z', pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.value).join()") == 'target')
    check('add2: hidden selection cleared', pg.inner_text('#w-save') == 'Choose a store')
    pg.fill('#w-q', ''); pg.wait_for_timeout(50)
    # Review Focus 3: live store update keeps focus and selection
    pg.check('input[name=store][value=ralphs]'); pg.focus('input[name=store][value=ralphs]')
    fs_write(pg, 'merchants/zzz-cafe', {'name': 'Zzz Cafe', 'category': 'Coffee', 'count': 1})
    check('add2: live update keeps selection', pg.evaluate("document.querySelector('input[name=store]:checked').value") == 'ralphs')
    check('add2: live update keeps focus', pg.evaluate("document.activeElement.value") == 'ralphs')
    check('add2: new store appears', pg.locator('input[name=store][value=zzz-cafe]').count() == 1)
    # Edit amount keeps state
    pg.click('#layer .ctx [data-act=back-amount]'); pg.wait_for_timeout(50)
    check('add2: Edit amount keeps amount', pg.inner_text('#amt') == '$45.12')
    next_step(pg)
    check('add2: back keeps selection', pg.evaluate("document.querySelector('input[name=store]:checked')?.value") == 'ralphs')
    pg.click('#w-save'); pg.wait_for_timeout(100)
    check('add2: saved Ralphs', [e['merchant'] for e in expenses(pg)] == ['Ralphs'])
    # New store needs a category
    start_add(pg); keys(pg, '9'); next_step(pg); pg.fill('#w-q', 'Blue Bottle'); pg.wait_for_timeout(50)
    check('add2: new-store tile first', pg.evaluate("document.querySelector('input[name=store]').value") == '__new__'
          and 'Add Blue Bottle as a new store' in pg.inner_text('#w-list'))
    pg.check('input[name=store][value=__new__]'); pg.wait_for_timeout(50)
    check('add2: category select labelled', pg.inner_text('label[for=w-cat]') == 'Category for Blue Bottle')
    pg.click('#w-save')
    check('add2: category required', pg.inner_text('#w-err') == 'Pick a category for Blue Bottle'
          and pg.evaluate('document.activeElement.id') == 'w-cat' and len(expenses(pg)) == 1)
    pg.select_option('#w-cat', 'Coffee'); pg.click('#w-save'); pg.wait_for_timeout(100)
    check('add2: new store saved + learned', st(pg).get('merchants/blue-bottle', {}).get('category') == 'Coffee')
    # Enter selects, Enter again saves
    start_add(pg); keys(pg, '3'); next_step(pg); pg.fill('#w-q', 'aldi'); pg.press('#w-q', 'Enter'); pg.wait_for_timeout(50)
    check('add2: Enter selects exact match', pg.evaluate("document.querySelector('input[name=store]:checked')?.value") == 'aldi' and len(expenses(pg)) == 2)
    pg.press('#w-q', 'Enter'); pg.wait_for_timeout(100)
    check('add2: Enter again saves', len(expenses(pg)) == 3)
    # Details row
    start_add(pg); keys(pg, '3'); next_step(pg)
    check('add2: details summary', pg.inner_text('#w-sum') == 'Today · split 50/50 · usual category')
    check('add2: details collapsed', pg.get_attribute('[data-act=toggle-opts]', 'aria-expanded') == 'false')
    open_details(pg)
    check('add2: details expanded', pg.get_attribute('[data-act=toggle-opts]', 'aria-expanded') == 'true' and pg.is_visible('#o-date'))
    check('add2: split is a labelled group', pg.inner_text('#o-split-set legend') == 'Split')
    c.close()
```

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `add2:` checks.

- [ ] **Step 3: Implement step 2 in `app.js`**

Replace `topStores`, `optsSummary`, `renderWhere`, `optsPanelHTML`, and `renderStoreList` with:
```js
const NEW = "__new__";
function storeList(q) {
  const ql = q.trim().toLowerCase();
  return Object.entries(S.merchants).map(([id, m]) => Object.assign({ id }, m))
    .filter(m => m.name && (!ql || m.name.toLowerCase().includes(ql)))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
const cleanQ = () => A.q.trim().replace(/\s+/g, " ");
function optsSummary() {
  return [A.date === todayISO() ? "Today" : shortDate(A.date), A.split === "full" ? "owed in full" : "split 50/50", A.category || "usual category"].join(" · ");
}
function saveLabel() {
  if (!A.sel) return "Choose a store";
  const name = A.sel === NEW ? cleanQ() : (S.merchants[A.sel] || {}).name;
  return `Save ${fmt(A.cents)} at ${name}`;
}
function splitFieldset(name, value) {
  return `<fieldset class="fs" id="${name}-set"><legend class="label">Split</legend><div class="segr">
    <label><input type="radio" name="${name}" value="half" ${value === "half" ? "checked" : ""}><span>50/50</span></label>
    <label><input type="radio" name="${name}" value="full" ${value === "full" ? "checked" : ""}><span>Owed in full</span></label></div></fieldset>`;
}
const splitHelp = () => A.split === "full" ? `${PEOPLE[other(A.payer)]} pays back the whole ${fmt(A.cents)}.` : `${PEOPLE[other(A.payer)]} owes ${fmt(Math.round(A.cents / 2))}.`;
function renderWhere() {
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Where was it?</h1><p class="step">Step 2 of 2</p>
      <p class="ctx small">${fmt(A.cents)}, paid by ${A.payer === S.me ? "you" : esc(PEOPLE[A.payer])} · <button class="link inline" data-act="back-amount">Edit amount</button></p></div></header>
    <div class="scroll"><div class="inner">
      <label class="label" for="w-q">Store</label>
      <input id="w-q" class="search" placeholder="Search, or type a new one" autocomplete="off" autocapitalize="words" value="${esc(A.q)}">
      <button class="details" data-act="toggle-opts" aria-expanded="${A.showOpts}" aria-controls="w-opts">
        <span>Details: <span id="w-sum">${esc(optsSummary())}</span></span><span aria-hidden="true">${A.showOpts ? "▴" : "▾"}</span></button>
      <div class="panel card" id="w-opts" style="padding:2px 16px 16px" ${A.showOpts ? "" : "hidden"}>${optsPanelHTML()}</div>
      <p class="err left" id="w-err" hidden></p>
      <div id="w-list"></div>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="back-amount">Back</button>
      <button class="btn primary grow2" data-act="save-where" id="w-save">${esc(saveLabel())}</button></div></footer>
  </div>`);
  renderStoreList();
}
function optsPanelHTML() {
  return `<label class="label" for="o-date">Date</label><input id="o-date" class="input" type="date" value="${esc(A.date)}">
    <div style="margin-top:14px">${splitFieldset("o-split", A.split)}</div>
    <p class="help" id="o-split-help">${esc(splitHelp())}</p>
    <label class="label" for="o-cat">Category</label>
    <select id="o-cat" class="input"><option value="">Use the store’s usual category</option>${CATEGORIES.map(c => `<option ${A.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
    <label class="label" for="o-note">Note</label><input id="o-note" class="input" placeholder="Dog food" value="${esc(A.note)}">
    <label class="label" for="o-covers">Covers</label><input id="o-covers" class="input" placeholder="July – September" value="${esc(A.covers)}" aria-describedby="o-covers-help">
    <p class="help" id="o-covers-help">For bills that pay for more than one month.</p>`;
}
function renderStoreList() {
  const box = $("#w-list"); if (!box) return;
  const q = cleanQ(), list = storeList(q);
  const exact = list.find(m => m.name.toLowerCase() === q.toLowerCase());
  if (A.sel && A.sel !== NEW && !list.some(m => m.id === A.sel)) A.sel = null;   // never keep a hidden selection
  if (A.sel === NEW && (!q || exact)) A.sel = null;
  const tile = (value, label, sub) => `<label class="store${value === NEW ? " new" : ""}"><input type="radio" name="store" value="${esc(value)}" ${A.sel === value ? "checked" : ""}>
    <span>${label}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="tick" aria-hidden="true">✓</span></label>`;
  const tiles = (q && !exact ? [tile(NEW, `Add ${esc(q)} as a new store`, "")] : []).concat(list.map(m => tile(m.id, esc(m.name), m.category || "")));
  keepFocus(() => {
    box.innerHTML = (tiles.length
      ? `<fieldset class="fs" aria-describedby="w-err"><legend class="sr">Choose a store</legend><div class="grid">${tiles.join("")}</div></fieldset>`
      : `<p class="muted">Type a store name to add it.</p>`)
      + (A.sel === NEW ? `<label class="label" for="w-cat">Category for ${esc(q)}</label>
        <select id="w-cat" class="input" aria-describedby="w-err"><option value="">Choose a category</option>${CATEGORIES.map(c => `<option ${A.newCat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : "");
  });
  const s = $("#w-save"); if (s) s.textContent = saveLabel();
}
function saveWhere() {
  const err = $("#w-err");
  const fail = (msg, el) => { err.textContent = msg; err.hidden = false; announce(msg); if (el) el.focus(); };
  if (!A.sel) return fail("Pick a store first", $("#w-list input[name=store]") || $("#w-q"));
  readOpts();
  if (A.sel === NEW) {
    const name = cleanQ(), sel = $("#w-cat");
    if (!A.newCat) { sel.setAttribute("aria-invalid", "true"); return fail(`Pick a category for ${name}`, sel); }
    return saveNew(name, A.newCat);
  }
  const m = S.merchants[A.sel]; if (m) saveNew(m.name, m.category);
}
```
In `startAdd`'s `Object.assign`, replace `newStore: null` with `sel: null, newCat: ""`.

**Click cases:** delete `"store"`, `"new-store"`, `"new-cat"`, `"cancel-new"`, and `"o-split"`. Add `case "save-where": saveWhere(); break;`. Replace `"toggle-opts"` with:
```js
    case "toggle-opts": readOpts(); A.showOpts = !A.showOpts; $("#w-opts").hidden = !A.showOpts;
      el.setAttribute("aria-expanded", A.showOpts); el.lastElementChild.textContent = A.showOpts ? "▴" : "▾"; $("#w-sum").textContent = optsSummary(); break;
```
**Change listener:** add to the one created in Task 5:
```js
  if (t.name === "store") { A.sel = t.value; $("#w-err").hidden = true; if (A.sel === NEW) { A.newCat = A.newCat || A.category || ""; renderStoreList(); } else $("#w-save").textContent = saveLabel(); }
  if (t.id === "w-cat") { A.newCat = t.value; t.removeAttribute("aria-invalid"); $("#w-err").hidden = true; }
  if (t.name === "o-split") { A.split = t.value; $("#o-split-help").textContent = splitHelp(); $("#w-sum").textContent = optsSummary(); }
```
**Input listener:** the `w-q` branch becomes `if (ev.target.id === "w-q") { A.q = ev.target.value; renderStoreList(); }`.

**Keydown:** replace the `w-q` Enter branch with:
```js
  if (ev.key === "Enter" && ev.target.id === "w-q") { ev.preventDefault();
    const q = cleanQ(); if (!q) return;
    const exact = storeList(q).find(m => m.name.toLowerCase() === q.toLowerCase()), want = exact ? exact.id : NEW;
    if (A.sel === want && (want !== NEW || A.newCat)) { saveWhere(); return; }
    A.sel = want; if (want === NEW) A.newCat = A.newCat || A.category || "";
    renderStoreList(); if (want === NEW) { const s = $("#w-cat"); if (s) s.focus(); } }
```
**Merchants snapshot:** it already calls `renderStoreList()` when `A.step === "where"`. `keepFocus` and the hidden-selection rule handle the rest.

- [ ] **Step 4: CSS in `index.html`** (replace the `.store`, `.store small`, `.store.new` rules)

```css
.store{position:relative;display:flex;align-items:center;gap:8px;min-height:56px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface);font-weight:500;padding:6px 12px;line-height:1.2;cursor:pointer}
.store input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}
.store > span:first-of-type{flex:1;min-width:0}
.store small{display:block;font-size:13px;color:var(--muted);font-weight:400;margin-top:2px}
.store .tick{visibility:hidden;color:var(--accent);font-weight:700}
.store:has(input:checked){border:2px solid var(--accent);padding:5px 11px}
.store:has(input:checked) .tick{visibility:visible}
.store:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.store.new{grid-column:1 / -1;border-style:dashed;color:var(--accent);font-weight:600}
.details{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;min-height:48px;margin-top:12px;padding:0 14px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface);font-size:15px;text-align:left}
.ctx{margin:6px 0 0;color:var(--muted)}
.link.inline{min-height:44px;padding:0 4px}
.err.left{text-align:left}
```
The bottom `.opts` rule is no longer used. Delete it.

- [ ] **Step 5: Update the harness store helpers** in `test/harness.py`

```python
def save_at_store(pg, store_id):
    pg.fill('#w-q', ''); pg.check(f'input[name=store][value="{store_id}"]'); pg.click('#w-save'); pg.wait_for_timeout(100)
def save_new_store(pg, name, category):
    pg.fill('#w-q', name); pg.wait_for_timeout(50); pg.check('input[name=store][value=__new__]'); pg.wait_for_timeout(50)
    pg.select_option('#w-cat', category); pg.click('#w-save'); pg.wait_for_timeout(100)
def set_split(pg, v): pg.check(f'input[name=o-split][value={v}]')
```
`save_at_store` clears the search first, so every store is listed before it selects one.

- [ ] **Step 6: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html test/harness.py test/suite_add.py
git commit -m "Add flow step 2: 'Where was it?', A–Z stores, select then save, labelled new-store category"
```

---

### Task 7: Edit screen: labeled groups and linked errors

**Files:**
- Create: `test/suite_edit.py`
- Modify: `app.js` (`openEdit`, `saveEdit` validation, change listener; delete the `e-payer`/`e-split` click cases)

**Interfaces:**
- Consumes: `payerFieldset`, `splitFieldset`, `E.orig` (Task 4)
- Produces: edit radios `input[name=e-payer]` and `input[name=e-split]`. Errors in `#e-err`, linked with `aria-describedby`

- [ ] **Step 1: Write the failing test `test/suite_edit.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('#toast [data-toast="x"]')
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{eid}"]')
    check('edit: paid-by group', pg.inner_text('#e-payer-set legend') == 'Paid by')
    check('edit: split group', pg.inner_text('#e-split-set legend') == 'Split')
    pg.fill('#e-amt', 'abc'); pg.click('[data-act=e-save]')
    check('edit: amount error linked', pg.get_attribute('#e-amt', 'aria-invalid') == 'true'
          and 'e-err' in (pg.get_attribute('#e-amt', 'aria-describedby') or '') and pg.evaluate('document.activeElement.id') == 'e-amt')
    pg.fill('#e-amt', '12'); pg.fill('#e-store', ''); pg.click('[data-act=e-save]')
    check('edit: store error linked', pg.get_attribute('#e-store', 'aria-invalid') == 'true' and pg.evaluate('document.activeElement.id') == 'e-store'
          and pg.get_attribute('#e-amt', 'aria-invalid') is None)
    pg.fill('#e-store', 'Costco'); pg.check('input[name=e-payer][value=kyle]'); pg.check('input[name=e-split][value=full]'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    e = st(pg)[f'expenses/{eid}']
    check('edit: radios saved', e['payer'] == 'kyle' and e['split'] == 'full')
    c.close()
```
Add `suite_edit` to `SUITES`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `edit:` checks.

- [ ] **Step 3: Implement**

In `openEdit`'s HTML, replace the "Paid by" `<span class="label">` and its `.seg` div with `${payerFieldset("e-payer", E.payer)}`. Replace the "Split" span and its `.seg` with `<div style="margin-top:14px">${splitFieldset("e-split", E.split)}</div>`. Change the error paragraph to `<p class="err left" id="e-err" hidden></p>`. Delete the `"e-payer"` and `"e-split"` click cases. Add to the change listener:
```js
  if (t.name === "e-payer") E.payer = t.value;
  if (t.name === "e-split") E.split = t.value;
```
In `saveEdit`, replace the two validation lines with:
```js
  const fail = (msg, id) => {
    ["e-amt", "e-store"].forEach(x => { const f = $("#" + x); f.removeAttribute("aria-invalid"); f.removeAttribute("aria-describedby"); });
    const f = $("#" + id); f.setAttribute("aria-invalid", "true"); f.setAttribute("aria-describedby", "e-err");
    err.textContent = msg; err.hidden = false; f.focus();
  };
  if (!c || c > 10000000) return fail("Enter an amount, like 24.99", "e-amt");
  if (!name) return fail("Add where it was from", "e-store");
```

- [ ] **Step 4: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js test/suite_edit.py test/run.py
git commit -m "Edit screen: labelled Paid-by and Split groups, errors linked and focused"
```

---

### Task 8: Profiles: look, appearance, account, and per-person colors and theme

**Files:**
- Create: `test/suite_profile.py`
- Modify: `app.js` (constants `EMOJI`, `PALETTE`, `DEFAULT_PROFILE`; `profileOf`, `resolveColors`, `applyPersonColors`, `applyTheme`, `avatarHTML`, `openProfile`, `renderProfile`, `saveProfile`; profile subscriptions; header avatar; rows and legend use avatars; account card removed from History), `copy.js` (`COLOR_NAMES`, `EMOJI_NAMES`, `C.colorMoved`), `index.html` (theme variables restructure, early theme script, CSS), `test/harness.py` (`open_account`, `leave_account`)

**Interfaces:**
- Consumes: `openLayer`, `keepFocus`, `setDoc`, `onSnapshot`, `doc`
- Produces:
  - Firestore `config/profile-{bre|kyle}`: `{ emoji: string|null, color: string, theme: "system"|"light"|"dark", updatedAt: number }`
  - `S.profiles: { bre?: object, kyle?: object }`, `profileOf(p)`, `resolveColors() -> { bre, kyle, moved: "bre"|"kyle"|null }`, `avatarHTML(p, size) -> html`
  - CSS variables `--bre-l/--bre-d/--kyle-l/--kyle-d` on `<html>`, and `<html data-theme="light|dark">` (absent means match phone)
  - Header button `data-act="profile"` with `aria-label="Profile"`. Profile radios `p-emoji`, `p-color`, `p-theme`
  - `renderProfile()` contains `<!--stats-->`, which Task 9 replaces with the stats section

- [ ] **Step 1: Write the failing test `test/suite_profile.py`**

```python
from harness import *

def css(pg, name): return pg.evaluate(f"getComputedStyle(document.documentElement).getPropertyValue('{name}').trim()")

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('profile: avatar button named', pg.get_attribute('[data-act=profile]', 'aria-label') == 'Profile')
    check('profile: avatar shows initial', pg.inner_text('[data-act=profile]').strip() == 'B')
    pg.click('[data-act=profile]'); pg.wait_for_timeout(50)
    check('profile: opens as a named layer', pg.inner_text('#layer-title') == 'Profile' and pg.title() == 'Profile · Expenses')
    check('profile: sections', pg.evaluate("[...document.querySelectorAll('#layer h2')].map(h => h.textContent).join('|')") == 'Your look|Appearance|Account')
    check('profile: partner color taken', pg.is_disabled('input[name=p-color][value=green]') and 'Kyle’s color' in pg.inner_text('#layer'))
    pg.check('input[name=p-emoji][value="🌻"]'); pg.wait_for_timeout(50)
    check('profile: emoji saved', st(pg).get('config/profile-bre', {}).get('emoji') == '🌻')
    check('profile: emoji radio keeps focus', pg.evaluate("document.activeElement.name") == 'p-emoji')
    pg.check('input[name=p-color][value=blue]'); pg.wait_for_timeout(50)
    check('profile: color saved + applied', st(pg)['config/profile-bre']['color'] == 'blue' and css(pg, '--bre-l').lower() == '#2b63b5')
    pg.check('input[name=p-theme][value=dark]'); pg.wait_for_timeout(50)
    check('profile: theme applied', pg.evaluate("document.documentElement.dataset.theme") == 'dark'
          and pg.evaluate("localStorage.getItem('theme')") == 'dark' and st(pg)['config/profile-bre']['theme'] == 'dark')
    check('profile: account here', pg.locator('#layer [data-act=reset-pass]').count() == 1 and pg.locator('#layer [data-act=signout]').count() == 1)
    pg.click('[data-act=close]'); pg.wait_for_timeout(50)
    check('profile: focus back on avatar', pg.evaluate("document.activeElement.dataset.act") == 'profile')
    open_history(pg)
    check('profile: account gone from History', pg.locator('#app [data-act=signout]').count() == 0)
    go_home(pg)
    # Review Focus 3: a partner's profile update while Profile is open keeps focus
    pg.click('[data-act=profile]'); pg.focus('input[name=p-theme][value=dark]')
    fs_write(pg, 'config/profile-kyle', {'emoji': '🐶', 'updatedAt': 1})
    check('profile: partner update keeps focus', pg.evaluate("document.activeElement.value") == 'dark')
    pg.click('[data-act=close]')
    # Partner sees it
    logout(pg); login(pg, 'kyle')
    check('profile: partner sees emoji', '🌻' in pg.inner_text('.legend') or '🌻' in pg.inner_text('#app'))
    check('profile: theme is per person', pg.evaluate("document.documentElement.dataset.theme") is None)
    # Review Focus 5: both pick the same color
    fs_write(pg, 'config/profile-kyle', {'color': 'blue', 'updatedAt': 9999999999999})
    check('profile: clash resolved to two colors', css(pg, '--kyle-l').lower() != css(pg, '--bre-l').lower())
    pg.click('[data-act=profile]')
    check('profile: clash explained to the later saver', 'picked this color too' in pg.inner_text('#layer'))
    c.close()
    # The early script applies the saved theme on a fresh load (signed out, so nothing else sets it)
    c = new_ctx(b); pg = open_app(c); login(pg); pg.click('[data-act=profile]'); pg.check('input[name=p-theme][value=light]')
    pg.click('[data-act=close]'); logout(pg)
    pg.reload(wait_until='domcontentloaded')
    check('profile: early theme from storage', pg.evaluate("document.documentElement.dataset.theme") == 'light')
    c.close()
```
Add `suite_profile` to `SUITES`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `profile:` checks.

- [ ] **Step 3: Restructure the theme variables in `index.html`**

Replace the `:root{…}` and `@media (prefers-color-scheme: dark){…}` blocks (lines 17–31) with:
```css
:root{
  --bg:#F3F4F1; --surface:#FFFFFF; --sunk:#E7E9E4; --ink:#1C2320; --muted:#5B645F; --line:#DCE0DA;
  --accent:#1F4E5F; --on-accent:#FFFFFF; --av-ink:#FFFFFF;
  --bre:var(--bre-l,#8A4FA3); --kyle:var(--kyle-l,#2F7D5B);
  --warn-bg:#FBF0DC; --warn:#7A4A00; --danger:#B42318;
  --r-sm:12px; --r-lg:18px;
  --safe-t:env(safe-area-inset-top,0px); --safe-b:env(safe-area-inset-bottom,0px);
  color-scheme:light;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#121614; --surface:#1B201E; --sunk:#262D2A; --ink:#E8ECE9; --muted:#9AA39E; --line:#2E3532;
    --accent:#8CC3D3; --on-accent:#0E1A1F; --av-ink:#0E1A1F;
    --bre:var(--bre-d,#C79BDB); --kyle:var(--kyle-d,#7FC9A5);
    --warn-bg:#3A2D14; --warn:#F2C980; --danger:#F49B92; color-scheme:dark;
  }
  :root:not([data-theme="light"]) .sw{background:var(--sw-d)}
}
:root[data-theme="dark"]{
  --bg:#121614; --surface:#1B201E; --sunk:#262D2A; --ink:#E8ECE9; --muted:#9AA39E; --line:#2E3532;
  --accent:#8CC3D3; --on-accent:#0E1A1F; --av-ink:#0E1A1F;
  --bre:var(--bre-d,#C79BDB); --kyle:var(--kyle-d,#7FC9A5);
  --warn-bg:#3A2D14; --warn:#F2C980; --danger:#F49B92; color-scheme:dark;
}
:root[data-theme="dark"] .sw{background:var(--sw-d)}
```
Add this as the first element inside `<head>`, before `<style>`:
```html
<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}</script>
```
Add CSS:
```css
.av{display:inline-grid;place-items:center;border-radius:50%;background:var(--c);color:var(--av-ink);font-weight:700;flex:none;line-height:1}
.avatar-btn{min-width:44px;min-height:44px;border:0;background:none;padding:0;display:grid;place-items:center;border-radius:50%}
.sec{font-size:17px;font-weight:600;margin:24px 0 8px}
.preview{display:flex;align-items:center;gap:14px;margin:4px 0 8px}
.preview p{margin:0;font-size:20px}
.emoji-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:8px}
.color-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pick{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--surface);cursor:pointer;font-size:24px}
.pick.color{justify-content:flex-start;padding:6px 12px;font-size:15px;font-weight:500}
.pick.color small{display:block;font-size:13px;color:var(--muted);font-weight:400}
.pick input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}
.pick:has(input:checked){border:2px solid var(--accent)}
.pick:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.pick:has(input:disabled){opacity:.6;cursor:not-allowed}
.sw{width:22px;height:22px;border-radius:50%;background:var(--sw-l);flex:none}
.btnrow{display:flex;gap:10px;margin-top:14px}
```

- [ ] **Step 4: Add the profile strings to `copy.js`**

```js
export const COLOR_NAMES = { plum: "Plum", green: "Green", blue: "Blue", teal: "Teal", coral: "Coral", amber: "Amber", rose: "Rose", slate: "Slate" };
export const EMOJI_NAMES = { "🌻": "Sunflower", "🌵": "Cactus", "🍋": "Lemon", "🍑": "Peach", "🐶": "Dog", "🐱": "Cat", "🦊": "Fox", "🐻": "Bear",
  "🐼": "Panda", "🐸": "Frog", "🐙": "Octopus", "☕": "Coffee", "🌙": "Moon", "⭐": "Star", "🎧": "Headphones", "🚲": "Bike" };
export const colorMoved = (partner, colorName) => `${partner} picked this color too, so yours shows as ${colorName} for now.`;
```
Add `COLOR_NAMES, EMOJI_NAMES, colorMoved` to app.js's `copy.js` import.

- [ ] **Step 5: Implement profiles in `app.js`**

After `CATEGORIES`:
```js
const EMOJI = ["🌻", "🌵", "🍋", "🍑", "🐶", "🐱", "🦊", "🐻", "🐼", "🐸", "🐙", "☕", "🌙", "⭐", "🎧", "🚲"];
// [light, dark]. Each passes 4.5:1 against the surface and background in its mode.
const PALETTE = { plum: ["#8A4FA3", "#C79BDB"], green: ["#2F7D5B", "#7FC9A5"], blue: ["#2B63B5", "#8DB4F0"], teal: ["#1F7A80", "#79CDD2"],
  coral: ["#C2412D", "#F29A8A"], amber: ["#A35C00", "#F2B866"], rose: ["#B83A73", "#F0A1C4"], slate: ["#4F5D75", "#AEB9CC"] };
const DEFAULT_PROFILE = { bre: { emoji: null, color: "plum", theme: "system", updatedAt: 0 }, kyle: { emoji: null, color: "green", theme: "system", updatedAt: 0 } };
```
Add `profiles: {}` to `S`. Then add a Profiles section:
```js
/* ---------------- Profiles ---------------- */
const profileOf = p => Object.assign({}, DEFAULT_PROFILE[p], S.profiles[p] || {});
// If both end up with the same color (e.g. saved offline at once), whoever saved later is shown the next free color.
function resolveColors() {
  const b = profileOf("bre"), k = profileOf("kyle");
  const out = { bre: PALETTE[b.color] ? b.color : "plum", kyle: PALETTE[k.color] ? k.color : "green", moved: null };
  if (out.bre === out.kyle) {
    const later = (b.updatedAt || 0) > (k.updatedAt || 0) ? "bre" : "kyle";
    out[later] = Object.keys(PALETTE).find(c => c !== out[other(later)]); out.moved = later;
  }
  return out;
}
function applyPersonColors() {
  const r = resolveColors(), s = document.documentElement.style;
  for (const p of ["bre", "kyle"]) { s.setProperty(`--${p}-l`, PALETTE[r[p]][0]); s.setProperty(`--${p}-d`, PALETTE[r[p]][1]); }
}
function applyTheme(t) {
  const h = document.documentElement;
  if (t === "light" || t === "dark") h.dataset.theme = t; else delete h.dataset.theme;
  store("theme", t || "system");
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    m.content = t === "dark" ? "#121614" : t === "light" ? "#F3F4F1" : (m.media.includes("dark") ? "#121614" : "#F3F4F1");
  });
}
function avatarHTML(p, size = 28) {
  const pr = profileOf(p);
  return `<span class="av" style="--c:var(--${p});width:${size}px;height:${size}px;font-size:${Math.round(size * 0.55)}px" aria-hidden="true">${pr.emoji ? pr.emoji : esc(PEOPLE[p][0])}</span>`;
}
function openProfile() { S.layer = "profile"; renderProfile(); }
function renderProfile() {
  const me = S.me, them = other(me), p = profileOf(me), cols = resolveColors();
  openLayer(`<div class="frame">
    <header class="top tall"><div class="inner"><h1 id="layer-title" class="title-lg">Profile</h1></div></header>
    <div class="scroll"><div class="inner">
      <div class="preview">${avatarHTML(me, 64)}<p><b>${esc(PEOPLE[me])}</b></p></div>
      <section aria-labelledby="h-look"><h2 id="h-look" class="sec">Your look</h2>
        <fieldset class="fs"><legend class="label">Emoji</legend><div class="emoji-grid">
          <label class="pick"><input type="radio" name="p-emoji" value="" ${!p.emoji ? "checked" : ""}><span aria-hidden="true">${esc(PEOPLE[me][0])}</span><span class="sr">Use my initial, ${esc(PEOPLE[me][0])}</span></label>
          ${EMOJI.map(e => `<label class="pick"><input type="radio" name="p-emoji" value="${e}" ${p.emoji === e ? "checked" : ""}><span aria-hidden="true">${e}</span><span class="sr">${esc(EMOJI_NAMES[e])}</span></label>`).join("")}
        </div></fieldset>
        <fieldset class="fs" style="margin-top:12px"><legend class="label">Color</legend><div class="color-grid">
          ${Object.keys(PALETTE).map(k => { const taken = k === cols[them];
            return `<label class="pick color"><input type="radio" name="p-color" value="${k}" ${cols[me] === k ? "checked" : ""} ${taken ? "disabled" : ""}>
              <span class="sw" style="--sw-l:${PALETTE[k][0]};--sw-d:${PALETTE[k][1]}" aria-hidden="true"></span>
              <span>${esc(COLOR_NAMES[k])}${taken ? `<small>${esc(PEOPLE[them])}’s color</small>` : ""}</span></label>`; }).join("")}
        </div></fieldset>
        ${cols.moved === me ? `<p class="help">${esc(colorMoved(PEOPLE[them], COLOR_NAMES[cols[me]]))}</p>` : ""}
      </section>
      <section aria-labelledby="h-app"><h2 id="h-app" class="sec">Appearance</h2>
        <fieldset class="fs"><legend class="sr">Theme</legend><div class="segr three">
          ${[["system", "Match phone"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => `<label><input type="radio" name="p-theme" value="${v}" ${p.theme === v ? "checked" : ""}><span>${l}</span></label>`).join("")}
        </div></fieldset></section>
      <!--stats-->
      <section aria-labelledby="h-acct"><h2 id="h-acct" class="sec">Account</h2>
        <div class="card"><p style="margin:0 0 4px;font-weight:600">Signed in as ${esc(PEOPLE[me])}</p>
          <p class="muted small" style="margin:0">${esc(S.user ? S.user.email : "")}</p>
          <div class="btnrow"><button class="btn" data-act="reset-pass">Change password</button><button class="btn" data-act="signout">Sign out</button></div></div></section>
    </div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="close">Back</button></div></footer>
  </div>`);
}
function saveProfile(patch) {
  const next = Object.assign(profileOf(S.me), patch, { updatedAt: Date.now() });
  S.profiles[S.me] = next; applyPersonColors(); applyTheme(next.theme);
  setDoc(doc(db, "config", `profile-${S.me}`), next, { merge: true }).catch(writeFailed);
  renderProfile(); render();
}
```
The profile layer's `<h1>` is unchanged on re-render, so `openLayer` keeps focus on the radio through `keepFocus`.

**Change listener additions:**
```js
  if (t.name === "p-emoji") saveProfile({ emoji: t.value || null });
  if (t.name === "p-color") saveProfile({ color: t.value });
  if (t.name === "p-theme") saveProfile({ theme: t.value });
```
**Click case:** `case "profile": openProfile(); break;`

**Subscriptions:** in `subscribe()`, add:
```js
  for (const p of ["bre", "kyle"]) S.unsubs.push(onSnapshot(doc(db, "config", `profile-${p}`), snap => {
    S.profiles[p] = snap.exists() ? snap.data() : {};
    applyPersonColors(); if (p === S.me) applyTheme(profileOf(p).theme);
    if (S.layer === "profile") renderProfile();
    render();
  }, err));
```
In `onAuthStateChanged`, add `S.profiles = {};` with the other resets. When signed out (`!user`), add `applyTheme(store("theme") || "system");`, so the theme the last person saved still applies on the sign-in screen.

**Header:** in `homeHTML`, after the History button, add:
```js
      <button class="avatar-btn" data-act="profile" aria-label="Profile">${avatarHTML(S.me, 36)}</button>
```
**Legend:** replace both `<span class="dot" …></span>` in the legend with `${avatarHTML(S.me, 18)} ` and `${avatarHTML(them, 18)} `. Add `.legend > span{display:inline-flex;align-items:center;gap:6px}` to the CSS.
**Rows:** in `rowHTML`, replace the dot span with `${avatarHTML(e.payer, 28)}`.
**History:** in `historyHTML`, delete the whole account `<div class="card" style="margin-top:28px">…</div>`.

- [ ] **Step 6: Update the account helpers** in `test/harness.py`

```python
def open_account(pg): pg.click('[data-act=profile]'); pg.wait_for_timeout(50)
def leave_account(pg): pg.click('[data-act=close]'); pg.wait_for_timeout(50)
```

- [ ] **Step 7: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add app.js copy.js index.html test/harness.py test/suite_profile.py test/run.py
git commit -m "Profile: emoji and color (synced), theme, account; avatars across home"
```

---

### Task 9: Profile "This period" stats

**Files:**
- Modify: `app.js` (`periodStats`; `renderProfile` replaces `<!--stats-->`), `copy.js` (`C` stat strings), `index.html` CSS, `test/suite_profile.py` (append)

**Interfaces:**
- Consumes: `daysBetween`, `todayISO`, `fmt`, `S.expenses`, `S.settlements`
- Produces: `periodStats() -> null | { days, since: "settle"|"first", total, top: {name, count, cents}, big: expense }`

- [ ] **Step 1: Append failing tests to `test/suite_profile.py`** (a new block at the end of `run`)

```python
    c = new_ctx(b); pg = open_app(c); login(pg)
    pg.click('[data-act=profile]')
    check('stats: empty state', 'Stats show up once you add expenses.' in pg.inner_text('#layer'))
    pg.click('[data-act=close]')
    for amt, sid in (('45.12', 'costco'), ('10', 'costco'), ('20', 'target'), ('30', 'target')):
        start_add(pg); keys(pg, amt); next_step(pg); save_at_store(pg, sid)
    pg.wait_for_timeout(100); pg.click('[data-act=profile]')
    vals = pg.evaluate("[...document.querySelectorAll('.stat')].map(s => s.querySelector('dt').textContent + '=' + s.querySelector('dd').childNodes[0].textContent.trim())")
    check('stats: tiles', vals == ['Days since your first expense=0', 'Shared spending=$105.12', 'Top store=Costco', 'Biggest expense=$45.12'])
    c.close()
```
The top-store tie (two Costco, two Target) is broken by the higher total: Costco $55.12 vs Target $50.00.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on `stats: empty state` and `stats: tiles`.

- [ ] **Step 3: Implement**

Add to `C` in `copy.js`:
```js
  statsHeading: "This period",
  statsEmpty: "Stats show up once you add expenses.",
  statDaysSettle: "Days since you settled up",
  statDaysFirst: "Days since your first expense",
  statTotal: "Shared spending",
  statTop: "Top store",
  statBig: "Biggest expense",
```
In `app.js`:
```js
// Local arithmetic only: no extra reads.
function periodStats() {
  const list = S.expenses; if (!list.length) return null;
  const last = S.settlements[0], start = last ? last.date : list.map(e => e.date).sort()[0];
  const by = {};
  for (const e of list) { const m = by[e.merchant] = by[e.merchant] || { name: e.merchant, count: 0, cents: 0 }; m.count++; m.cents += e.amountCents | 0; }
  return {
    days: daysBetween(start, todayISO()), since: last ? "settle" : "first",
    total: list.reduce((s, e) => s + (e.amountCents | 0), 0),
    top: Object.values(by).sort((a, b) => b.count - a.count || b.cents - a.cents)[0],
    big: list.slice().sort((a, b) => b.amountCents - a.amountCents)[0]
  };
}
function statsHTML() {
  const s = periodStats();
  const body = !s ? `<p class="muted">${esc(C.statsEmpty)}</p>` : `<dl class="stats">
    <div class="stat"><dt>${esc(s.since === "settle" ? C.statDaysSettle : C.statDaysFirst)}</dt><dd>${s.days}</dd></div>
    <div class="stat"><dt>${esc(C.statTotal)}</dt><dd>${fmt(s.total)}</dd></div>
    <div class="stat"><dt>${esc(C.statTop)}</dt><dd>${esc(s.top.name)}<small>${s.top.count} expense${s.top.count === 1 ? "" : "s"}</small></dd></div>
    <div class="stat"><dt>${esc(C.statBig)}</dt><dd>${fmt(s.big.amountCents)}<small>${esc(s.big.merchant)}</small></dd></div></dl>`;
  return `<section aria-labelledby="h-stats"><h2 id="h-stats" class="sec">${esc(C.statsHeading)}</h2>${body}</section>`;
}
```
In `renderProfile`, replace `<!--stats-->` with `${statsHTML()}`. Update the Task 8 check `profile: sections` to expect `'Your look|Appearance|This period|Account'`.
CSS:
```css
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:12px 14px}
.stat dt{font-size:13px;color:var(--muted)}
.stat dd{margin:4px 0 0;font-size:20px;font-weight:700;overflow-wrap:anywhere}
.stat dd small{display:block;font-size:13px;font-weight:400;color:var(--muted)}
```

- [ ] **Step 4: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js copy.js index.html test/suite_profile.py
git commit -m "Profile: 'This period' stats from local data"
```

---

### Task 10: History: Settle-ups and Activity tabs

**Files:**
- Create: `test/suite_history.py`
- Modify: `app.js` (`historyHTML`, `activityHTML`, `subscribeActivity`; state `historyTab`, `activity`, `activityLimit`, `activityLoaded`, `activityError`, `activityUnsub`; the `more-activity` click case; the `h-tab` change), `copy.js` (`activityLine`, `C.emptyActivity`, `C.activityError`), `index.html` CSS

**Interfaces:**
- Consumes: `activity/*` docs from Task 4, `dayLabel`, `iso`, `timeOf`, `keepFocus`
- Produces: `activityLine(entry, names) -> string` in `copy.js`. Tab radios `input[name=h-tab]` with values `settle`/`activity`

- [ ] **Step 1: Write the failing test `test/suite_history.py`**

```python
from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    open_history(pg)
    check('history: tabs', pg.evaluate("[...document.querySelectorAll('input[name=h-tab]')].map(i => i.value + (i.checked ? '*' : '')).join()") == 'settle*,activity')
    pg.check('input[name=h-tab][value=activity]'); pg.wait_for_timeout(100)
    check('history: empty activity', 'Changes to expenses will show up here.' in pg.inner_text('#app'))
    check('history: tab keeps focus', pg.evaluate("document.activeElement.value") == 'activity')
    go_home(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.fill('#e-amt', '25'); pg.fill('#e-store', 'Target'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.click('[data-act=e-delete]'); pg.click('[data-act=e-delete]'); pg.wait_for_timeout(100)
    open_history(pg)
    check('history: tab remembered', pg.evaluate("document.querySelector('input[name=h-tab]:checked').value") == 'activity')
    pg.wait_for_timeout(100)
    lines = pg.evaluate("[...document.querySelectorAll('.act .t')].map(e => e.textContent)")
    check('history: activity sentences newest first', lines == [
        'Bre deleted $25.00 at Target',
        'Bre changed Costco: amount $45.12 → $25.00, store Costco → Target',
        'Bre added $45.12 at Costco'])
    check('history: grouped under Today', pg.inner_text('#app .group h2') == 'Today')
    check('history: shows time', pg.evaluate("/\\d:\\d\\d [AP]M/.test(document.querySelector('.act .s').textContent)"))
    check('history: no Show more under limit', pg.locator('[data-act=more-activity]').count() == 0)
    c.close()
    # copy: long edits and settle lines
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => {
      const N = {bre: 'Bre', kyle: 'Kyle'};
      return [
        m.activityLine({by: 'kyle', action: 'edit', summary: {merchant: 'Costco'}, changes: [
          {field: 'amountCents', from: 100, to: 200}, {field: 'payer', from: 'bre', to: 'kyle'}, {field: 'split', from: 'half', to: 'full'},
          {field: 'date', from: '2026-10-01', to: '2026-10-02'}, {field: 'note', from: '', to: 'Gift'}]}, N),
        m.activityLine({by: 'kyle', action: 'settle', summary: {amountCents: 69022, from: 'bre', to: 'kyle'}}, N),
        m.activityLine({by: 'bre', action: 'settle', summary: {amountCents: 0, from: null, to: null}}, N)];
    })""")
    check('history: edit capped at 3', r[0] == 'Kyle changed Costco: amount $1.00 → $2.00, paid by Bre → Kyle, split 50/50 → owed in full, and 2 more')
    check('history: settle line', r[1] == 'Kyle settled up: Bre paid Kyle $690.22')
    check('history: even settle line', r[2] == 'Bre closed an even period')
    c.close()
```
Add `suite_history` to `SUITES`.

- [ ] **Step 2: Run to verify it fails**

Run: `python test/run.py`
Expected: FAIL on the `history:` checks.

- [ ] **Step 3: Add `activityLine` to `copy.js`**

```js
/* ---------- Activity log ---------- */
const FIELD_NAMES = { amountCents: "amount", payer: "paid by", merchant: "store", category: "category", date: "date", split: "split", note: "note", covers: "covers" };
function showVal(field, v, names) {
  if (v === "" || v == null) return "none";
  if (field === "amountCents") return fmt(v);
  if (field === "payer") return names[v] || v;
  if (field === "split") return v === "full" ? "owed in full" : "50/50";
  if (field === "date") return shortDate(v);
  return String(v);
}
export function activityLine(a, names) {
  const who = names[a.by] || "Someone", s = a.summary || {};
  switch (a.action) {
    case "add": return `${who} added ${fmt(s.amountCents)} at ${s.merchant}`;
    case "delete": return `${who} deleted ${fmt(s.amountCents)} at ${s.merchant}`;
    case "edit": {
      const ch = (a.changes || []).map(c => `${FIELD_NAMES[c.field] || c.field} ${showVal(c.field, c.from, names)} → ${showVal(c.field, c.to, names)}`);
      return `${who} changed ${s.merchant}: ${ch.slice(0, 3).join(", ")}${ch.length > 3 ? `, and ${ch.length - 3} more` : ""}`;
    }
    case "settle": return s.amountCents ? `${who} settled up: ${names[s.from]} paid ${names[s.to]} ${fmt(s.amountCents)}` : `${who} closed an even period`;
  }
  return `${who} made a change`;
}
```
Add to `C`: `emptyActivity: "Changes to expenses will show up here.",` and `activityError: "Couldn’t load activity. Check the security rules in Firebase.",`

- [ ] **Step 4: Implement History in `app.js`**

Add to `S`: `historyTab: "settle", activity: [], activityLimit: 100, activityLoaded: false, activityError: false, activityUnsub: null`. Add `activityLine` to the `copy.js` import.
Replace `historyHTML` with:
```js
function historyHTML() {
  const tab = S.historyTab;
  const tabs = `<fieldset class="fs" style="margin-bottom:12px"><legend class="sr">Show</legend><div class="segr">
    <label><input type="radio" name="h-tab" value="settle" ${tab === "settle" ? "checked" : ""}><span>Settle-ups</span></label>
    <label><input type="radio" name="h-tab" value="activity" ${tab === "activity" ? "checked" : ""}><span>Activity</span></label></div></fieldset>`;
  return `<div class="frame">
    <header class="top"><div class="inner" style="display:flex;align-items:center"><h1>History</h1></div></header>
    <div class="scroll"><div class="inner">${tabs}${tab === "settle" ? settleListHTML() : activityHTML()}</div></div>
    <footer class="dock"><div class="inner"><button class="btn" data-act="home">Back to expenses</button></div></footer>
  </div>`;
}
function settleListHTML() {
  if (!S.settlements.length) return `<div class="card empty"><h2>No settle-ups yet</h2><p class="muted" style="margin:0">When you mark a balance as paid, it’s saved here with every expense it covered.</p></div>`;
  return `<div class="rows">` + S.settlements.map(s => {
    const line = s.amountCents ? `${PEOPLE[s.from]} paid ${PEOPLE[s.to]} ${fmt(s.amountCents)}` : "Closed even";
    return `<button class="row" data-act="detail" data-id="${esc(s.id)}"><span class="main"><span class="t">${esc(line)}</span>
      <span class="s">${esc(longDate(s.date))}, ${s.count} expense${s.count === 1 ? "" : "s"}</span></span></button>`;
  }).join("") + `</div>`;
}
function activityHTML() {
  if (S.activityError) return `<p class="err left">${esc(C.activityError)}</p>`;
  if (!S.activityLoaded) return `<p class="muted">Loading activity…</p>`;
  if (!S.activity.length) return `<div class="card empty"><p class="muted" style="margin:0">${esc(C.emptyActivity)}</p></div>`;
  let out = "", cur = null;
  for (const a of S.activity) {
    const day = iso(new Date(a.at));
    if (day !== cur) { if (cur !== null) out += `</ul></section>`; cur = day; out += `<section class="group"><h2>${esc(dayLabel(day))}</h2><ul class="rows plain">`; }
    out += `<li class="row act"><span class="main"><span class="t wrap">${esc(activityLine(a, PEOPLE))}</span><span class="s">${esc(timeOf(a.at))}</span></span></li>`;
  }
  out += `</ul></section>`;
  if (S.activity.length >= S.activityLimit) out += `<button class="btn" data-act="more-activity" style="width:100%;margin-top:14px">Show more</button>`;
  return out;
}
function subscribeActivity() {
  if (S.activityUnsub) S.activityUnsub();
  S.activityLoaded = false; S.activityError = false;
  S.activityUnsub = onSnapshot(query(collection(db, "activity"), orderBy("at", "desc"), limit(S.activityLimit)), snap => {
    S.activity = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); S.activityLoaded = true;
    if (S.view === "history") render();
  }, e => { console.error(e); S.activityError = true; if (S.view === "history") render(); });
}
```
**Change listener:** `if (t.name === "h-tab") { S.historyTab = t.value; if (t.value === "activity" && !S.activityUnsub) subscribeActivity(); render(); }`
**Click cases:**
- `case "more-activity": S.activityLimit += 100; subscribeActivity(); break;`
- Change `"history"` to `S.view = "history"; if (S.historyTab === "activity" && !S.activityUnsub) subscribeActivity(); render(); break;`

**`onAuthStateChanged`:** add `if (S.activityUnsub) S.activityUnsub(); Object.assign(S, { activityUnsub: null, activity: [], activityLimit: 100, historyTab: "settle" });`
**CSS:** `.plain{list-style:none;margin:0;padding:0}` and `.row .t.wrap{white-space:normal}`.

- [ ] **Step 5: Run tests**

Run: `python test/run.py`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app.js copy.js index.html test/suite_history.py test/run.py
git commit -m "History: Settle-ups and Activity tabs with a readable change log"
```

---

### Task 11: axe sweep of every screen, light and dark

**Files:**
- Create: `test/suite_axe.py`
- Modify: whichever app files the scan flags

**Interfaces:**
- Consumes: every screen and helper above

- [ ] **Step 1: Confirm the axe API**

Run: `python -c "import inspect; from axe_playwright_python.sync_playwright import Axe; print(inspect.signature(Axe.run))"`
Expected: a signature that includes `page` and `options`. If it differs, adapt the `scan` helper below to it. Only the helper should change.

- [ ] **Step 2: Write `test/suite_axe.py`**

```python
from harness import *
from axe_playwright_python.sync_playwright import Axe

AXE = Axe()
OPTS = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag21a"]}}

def scan(pg, name):
    r = AXE.run(pg, options=OPTS)
    check(f'axe A: {name}', r.violations_count == 0)
    if r.violations_count: print(f'--- axe: {name} ---\n' + r.generate_report())

def run(b):
    for scheme in ('light', 'dark'):
        c = new_ctx(b, scheme); pg = open_app(c)
        scan(pg, f'{scheme} login')
        login(pg); scan(pg, f'{scheme} home empty')
        start_add(pg); keys(pg, '12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
        scan(pg, f'{scheme} home with expense + toast')
        start_add(pg); scan(pg, f'{scheme} add step 1')
        pg.click('[data-act=bill][data-id=water]'); scan(pg, f'{scheme} add step 1 bill')
        pg.click('[data-act=clear-bill]'); keys(pg, '7'); next_step(pg); scan(pg, f'{scheme} add step 2')
        open_details(pg); scan(pg, f'{scheme} add step 2 details')
        pg.fill('#w-q', 'Blue Bottle'); pg.check('input[name=store][value=__new__]'); pg.click('#w-save')
        scan(pg, f'{scheme} add step 2 new store + error')
        pg.keyboard.press('Escape')
        eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
        pg.click(f'[data-act=edit][data-id="{eid}"]'); scan(pg, f'{scheme} edit')
        pg.fill('#e-amt', ''); pg.click('[data-act=e-save]'); scan(pg, f'{scheme} edit error')
        pg.keyboard.press('Escape')
        pg.click('[data-act=settle]'); scan(pg, f'{scheme} settle')
        pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
        pg.click('[data-act=profile]'); scan(pg, f'{scheme} profile'); pg.click('[data-act=close]')
        open_history(pg); scan(pg, f'{scheme} history settle-ups')
        pg.click('[data-act=detail]'); pg.wait_for_timeout(150); scan(pg, f'{scheme} settle detail'); pg.click('[data-act=close]')
        pg.check('input[name=h-tab][value=activity]'); pg.wait_for_timeout(100); scan(pg, f'{scheme} history activity')
        c.close()
```
Add `suite_axe` to `SUITES`, last.

- [ ] **Step 3: Run the scan**

Run: `python test/run.py`
Expected on the first run: possibly some `axe A:` failures, each with a report printed. Every other check stays PASS.

- [ ] **Step 4: Fix each violation at its source**

For each printed rule, fix the markup in the screen that produced it, using the spec's patterns (labeled fieldsets, visible labels, `aria-describedby`). Don't suppress rules or exclude elements. Expected rules to watch for: `aria-valid-attr-value` (an `aria-describedby` pointing to a missing ID, such as `amt-hint` when a bill is selected; fix by only including IDs that exist), `label`, `button-name`, `nested-interactive`.

- [ ] **Step 5: Re-run until clean**

Run: `python test/run.py`
Expected: every line PASS, including all `axe A:` lines for both schemes.

- [ ] **Step 6: Commit**

```bash
git add test/suite_axe.py test/run.py app.js index.html copy.js ui.js
git commit -m "axe: every screen passes WCAG A in light and dark"
```

---

### Task 12: Docs, rules publish, and release

**Files:**
- Modify: `SETUP.md` (VoiceOver script; "publish rules" step), `CLAUDE.md`, `README.md`, `sw.js` (`CACHE`)

- [ ] **Step 1: Bump the offline cache version**

In `sw.js`: `const CACHE = "shared-expenses-v3";`

- [ ] **Step 2: Update `README.md`'s file table** with:
```
| `copy.js` | Every word the app shows, plus money and date formatting. Edit the voice here. |
| `ui.js` | Accessibility helpers: screens, focus, announcements, the undo message |
```
Also add a bullet under "How it works": "Each person has a profile (emoji, color, theme), and History keeps a log of every change."

- [ ] **Step 3: Update `CLAUDE.md`**

- **Files:** add `copy.js` (all wording and formatting) and `ui.js` (accessibility plumbing).
- **Collections:** add `activity` (at, by, action add/edit/delete/settle, expenseId, settlementId, summary, changes; add entries use the ID `add-{expenseId}`; append-only except Undo, which removes the add entry along with its expense) and `config/profile-{bre|kyle}` (emoji, color, theme, updatedAt).
- **Design principles:** replace "type an amount on the number pad, tap a store, and it's saved" with "type an amount, tap Next, tap a store to select it, then Save". Add "Stores are listed A–Z." Add "Voice: warm and plain; all wording lives in `copy.js`." Add "Accessibility: WCAG 2.2 Level A on every screen; every either/or choice is a native radio in a labelled fieldset; layers move focus in and back out."
- **Working agreements:** the test command becomes `python test/run.py` (`PW_CHANNEL=msedge` if Chromium isn't installed). Test emails live in `test/accounts.local.json` (gitignored).
- **Current status:** replace the "Known issue" and "Remaining setup" bullets with "Version 2 (profile, activity log, clearer add flow, WCAG A) released 2026-10."

- [ ] **Step 4: Add to `SETUP.md`**

Under "Updating the app later", add a subsection:
```markdown
### When the security rules change

Some updates need new database rules. When they do, publish the rules **before** uploading the new app:

1. In the Firebase console, open **Firestore Database**, then **Rules**.
2. Replace everything with the contents of `firebase-only/firestore.rules`, then click **Publish**.
3. Then push or upload the new app files.
```
And a new section after Part 4:
```markdown
## Part 5: VoiceOver check (iPhone, 10 minutes)

Turn on VoiceOver: **Settings → Accessibility → VoiceOver**. Swipe right to move, double-tap to activate.

- [ ] Open the app. You hear "Good morning, Bre" (or afternoon/evening), then the balance, such as "You owe Kyle, $42.10".
- [ ] Swipe to **Add expense** and double-tap. You hear "Add expense, heading".
- [ ] Swipe to the keypad and enter 12. You hear "Amount $12".
- [ ] Swipe to **Paid by**. You hear "You, radio button, selected".
- [ ] Double-tap **Next: choose store**. You hear "Where was it?".
- [ ] Swipe to **Store**, then to a store, and double-tap it. You hear it selected. The bottom button now says "Save $12.00 at …". Double-tap it.
- [ ] You hear "Got it. $12.00 at …". Swipe to **Undo** and double-tap. You hear "Removed".
- [ ] Add another expense and type a new store name. Choose "Add … as a new store", then pick a category and save.
- [ ] Double-tap **Profile** (your avatar). Change your color. You hear the choice selected.
- [ ] Open **History**, choose **Activity**, and swipe through the entries.
- [ ] Turn VoiceOver off.
```

- [ ] **Step 5: Run the full suite**

Run: `python test/run.py`
Expected: every line PASS.

- [ ] **Step 6: Check for emails and commit**

Run: `git grep -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}"` → prints nothing.
```bash
git add sw.js README.md CLAUDE.md SETUP.md
git commit -m "Docs and cache bump for the UX refresh"
```

- [ ] **Step 7: The owner publishes the rules** (stop and wait)

Ask the owner to paste `firebase-only/firestore.rules` into **Firestore Database → Rules** and click **Publish**. Don't push until they confirm.

- [ ] **Step 8: Push and verify live**

Run: `git push origin main`
Then check: `curl -s https://anna-fitz.github.io/expenses/sw.js | grep "const CACHE"` → `shared-expenses-v3` (allow about a minute). Also check that `ui.js` and `copy.js` both return 200.

- [ ] **Step 9: Owner phone pass**

Ask the owner to reopen the home-screen app, run Part 5 (VoiceOver) of SETUP.md, and add, edit, and delete a test expense. Then check that History → Activity shows the add, edit, and delete, and that an undone add leaves nothing.
