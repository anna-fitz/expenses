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
        const ok = r => r.width >= 44 && r.height >= 44, r = el.getBoundingClientRect();
        if ((!r.width && !r.height) || el.closest('[aria-hidden=true]')) return false;
        const l = el.id && document.querySelector(`label[for="${el.id}"]`);
        return !ok(r) && !(l && ok(l.getBoundingClientRect()));
      })
      .map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)""")
