# Helpers for the React app in web/dist-test. The fake Firebase SDK is bundled into that build, so fixtures
# go through window.__fbStore. Test people are placeholders: ids p1/p2, names Alex/Sam.
import hashlib
from harness import *
from harness import open_app as _open_app, login as _login

PEOPLE_FIX = {'a': ('p1', 'Alex'), 'b': ('p2', 'Sam')}
H = lambda k: hashlib.sha256(ACC[k].strip().lower().encode()).hexdigest()

def fs_write(pg, path, data):
    pg.evaluate("([segs, data]) => window.__fbStore.setDoc(window.__fbStore.doc({}, ...segs), data, {merge: true})", [path.split('/'), data])
    pg.wait_for_timeout(100)

def seed_people(pg, onboarded=True):
    fs_write(pg, 'config/people', {'members': {H(k): {'id': i, 'name': n} for k, (i, n) in PEOPLE_FIX.items()}})
    if onboarded:
        for i, _n in PEOPLE_FIX.values(): fs_write(pg, f'config/profile-{i}', {'onboarded': True})

def open_app(c, onboarded=True):
    pg = _open_app(c)
    seed_people(pg, onboarded)
    return pg

# The app's Sign out erases the device copy and reloads. In the fakes the reload also empties the "server",
# so wait for it to finish; reseed=True puts the server-side fixtures back, as real Firebase would still have them.
def sign_out_button(pg, reseed=False):
    with pg.expect_navigation(): pg.click('[data-act=signout]')
    pg.wait_for_selector('#login-form')
    if reseed: seed_people(pg)

def login(pg, who='a'): _login(pg, who)
def login_to(pg, who, wait_sel):
    pg.fill('#l-email', ACC[who]); pg.fill('#l-pass', 'correct-horse'); pg.click('#l-btn'); pg.wait_for_selector(wait_sel); pg.wait_for_timeout(150)
def logout(pg): pg.evaluate("window.__fbAuth.signOut()"); pg.wait_for_selector('#login-form')
def tab(pg, name): pg.click(f'[data-act=tab-{name}]'); pg.wait_for_timeout(100)
def title_top(pg): return pg.evaluate("document.getElementById('screen-title').getBoundingClientRect().top")
# Button labels use the type scale's body size (16px).
def off_scale_buttons(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('[data-slot=button]')].filter(b => b.getClientRects().length && getComputedStyle(b).fontSize !== '16px')
      .map(b => `"${b.textContent.trim().slice(0, 30)}" ${getComputedStyle(b).fontSize}`)""")
# Form labels (fields and checkboxes) use the type scale's body-strong size (16/24, weight 500).
def off_scale_labels(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('[data-slot=label]')].filter(l => { const s = getComputedStyle(l);
        return l.getClientRects().length && (s.fontSize !== '16px' || s.lineHeight !== '24px' || s.fontWeight !== '500'); })
      .map(l => { const s = getComputedStyle(l); return `"${l.textContent.trim().slice(0, 30)}" ${s.fontSize}/${s.lineHeight} ${s.fontWeight}`; })""")
def text_and_html(pg): return pg.evaluate("document.body.innerText + '\\n' + document.documentElement.outerHTML")

# Design language: every tap target is at least 44×44px. A control counts as big enough when its own box is,
# or when its <label for> is (a checkbox's whole label row is the target). Returns the offenders.
def small_targets(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('a[href], button, summary, input:not([type=hidden]), select, textarea, [role=checkbox], [role=radio]')]
      .filter(el => {
        const ok = r => r.width >= 43.99 && r.height >= 43.99, r = el.getBoundingClientRect();   // sub-pixel noise while a sheet slides in
        if ((!r.width && !r.height) || el.closest('[aria-hidden=true]')) return false;
        const l = el.id && document.querySelector(`label[for="${el.id}"]`);
        return !ok(r) && !(l && ok(l.getBoundingClientRect()));
      })
      .map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)""")

# ---- Sheets, the add flow, and toasts (ids and data-act values match the old app's) ----
def start_add(pg): pg.click('[data-act=add]'); pg.wait_for_selector('#layer-title'); pg.wait_for_timeout(50)
def keys(pg, s):
    for ch in s: pg.click(f'[data-act=key][data-k="{ch}"]')
def next_step(pg): pg.click('[data-act=next]'); pg.wait_for_timeout(80)
def log_it(pg): pg.click('[data-act=log]'); pg.wait_for_timeout(150)
def save_at_store(pg, store_id):   # step 2 → review → Log expense
    pg.fill('#w-q', ''); pg.check(f'input[name=store][value="{store_id}"]'); next_step(pg); log_it(pg)
def save_new_store(pg, name, category):
    pg.fill('#w-q', name); pg.check('input[name=store][value=__new__]'); pg.select_option('#w-cat', category); next_step(pg); log_it(pg)
def open_details(pg): pg.click('[data-act=details]'); pg.wait_for_selector('#details'); pg.wait_for_timeout(100)
def details_done(pg): pg.click('[data-act=details-done]'); pg.wait_for_timeout(200)
def set_split(pg, v): pg.check(f'input[name=o-split][value={v}]')
def pick_bill(pg, bill_id):
    pg.click('[data-act=pick-bill]'); pg.wait_for_selector('#bills'); pg.click(f'#bills [data-act=bill][data-id={bill_id}]'); pg.wait_for_timeout(200)
def rv(pg, key): return pg.inner_text(f'[data-row={key}] .v')
def options(pg, sel): return pg.evaluate(f"[...document.querySelectorAll('{sel} option')].map(o => o.textContent)")
def focused_in(pg, el_id): return pg.evaluate(f"document.getElementById('{el_id}')?.contains(document.activeElement) ?? false")
ORDER = ['Car & fuel', 'Coffee', 'Dining & takeout', 'Drinks & smoke shop', 'Gifts & occasions', 'Groceries', 'Home & household',
         'Pets', 'Pool & yard', 'Travel & fun', 'Utilities', 'Other']
def sheet_open(pg): return pg.locator('#layer').count() > 0
def close_sheet(pg): pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
def toast_text(pg): return pg.evaluate("document.querySelector('[data-sonner-toaster]')?.innerText || ''")
def toast_btn(pg, act): pg.click(f'[data-toast={act}]'); pg.wait_for_timeout(150)
def store_names(pg): return pg.evaluate("[...document.querySelectorAll('#w-list .name')].map(e => e.textContent)")
def store_values(pg): return pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.value)")
def checked(pg, name): return pg.evaluate(f"document.querySelector('input[name={name}]:checked')?.value ?? null")
def fs_delete(pg, path):
    pg.evaluate("(segs) => { const S = window.__fbStore, b = S.writeBatch(); b.delete(S.doc({}, ...segs)); return b.commit(); }", path.split('/'))
    pg.wait_for_timeout(100)
def fs_batch(pg, items):
    pg.evaluate("""(items) => { const S = window.__fbStore, b = S.writeBatch();
      for (const [path, data] of items) b.set(S.doc({}, ...path.split('/')), data, {merge: true}); return b.commit(); }""", [[p, d] for p, d in items])
    pg.wait_for_timeout(150)
