from web_harness import *
import os

# Install, offline, updates, and switch-over day. The only suite that turns the service worker on
# (new_ctx(..., sw='allow')); every other suite keeps it blocked so nothing is cached between checks.
SW = os.path.join(SITE, 'sw.js')
# Stand-in for the live app's worker: caches itself as "shared-expenses-v6", network first, takes control at once.
OLD_WORKER = """self.addEventListener("install", (e) => { e.waitUntil(caches.open("shared-expenses-v6").then((c) => c.put("./old", new Response("old"))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (e) => { if (e.request.method === "GET") e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
"""
WORKER = ("navigator.serviceWorker.getRegistration().then(r => r && r.active ? fetch(r.active.scriptURL, {cache: 'no-store'})"
          ".then(x => x.text()).then(t => t.includes('workbox') ? 'new' : 'old') : 'none')")
CACHED = ("caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.keys()))))"
          ".then(rs => rs.flat().map(r => new URL(r.url).pathname))")

def online_visit(b):
    """Sign in with the worker allowed, keeping the fake data across reloads (as Firestore's own offline copy would)."""
    c = new_ctx(b, sw='allow'); pg = c.new_page(); pg.on('pageerror', lambda e: ERRS.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('#login-form'); pg.evaluate("sessionStorage.setItem('__persist', '1')")
    seed_people(pg); login(pg); pg.evaluate('navigator.serviceWorker.ready'); pg.wait_for_timeout(500)
    return c, pg

def install_hint(b):
    c = new_ctx(b); pg = open_app(c, install_hint=True); login(pg)
    check('hint: shows in a browser, with the other-phone wording', pg.inner_text('#install-title') == 'Add Expenses to your Home Screen 📲'
          and 'Open the browser menu, then Install app or Add to Home screen.' in pg.inner_text('#install') and pg.get_attribute('#install', 'role') == 'region')
    pg.click('[data-act=hide-install]'); pg.wait_for_timeout(100)
    check('hint: Dismiss hides it, focus on the title', pg.locator('#install').count() == 0 and pg.evaluate('document.activeElement.id') == 'screen-title')
    tab(pg, 'history'); tab(pg, 'home')
    check('hint: …and remembers on this phone', pg.locator('#install').count() == 0 and pg.evaluate("localStorage.getItem('hideInstall')") == '1')
    c.close()
    c = new_ctx(b); c.add_init_script("Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })")
    pg = open_app(c, install_hint=True); login(pg)
    check('hint: iPhone wording', 'Tap Share, then Add to Home Screen. It opens full screen, like an app.' in pg.inner_text('#install'))
    c.close()
    c = new_ctx(b)
    c.add_init_script("const mm = window.matchMedia.bind(window); window.matchMedia = (q) => q.includes('display-mode: standalone')"
                      " ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q)")
    pg = open_app(c, install_hint=True); login(pg)
    check('hint: hidden when running installed', pg.locator('#install').count() == 0)
    c.close()

def installing(b):
    c = new_ctx(b); pg = open_app(c)
    check('install: head tags', pg.get_attribute('link[rel=icon]', 'href').endswith('icons/icon-192.png')
          and pg.get_attribute('link[rel=apple-touch-icon]', 'href').endswith('icons/apple-touch-icon.png')
          and pg.get_attribute('meta[name=apple-mobile-web-app-title]', 'content') == 'Expenses')
    has_manifest = pg.locator('link[rel=manifest]').count() == 1
    m = pg.evaluate("fetch(document.querySelector('link[rel=manifest]').href).then(r => r.json())") if has_manifest else {}
    check('install: the manifest', m.get('name') == 'Shared expenses' and m.get('short_name') == 'Expenses' and m.get('display') == 'standalone'
          and m.get('start_url') == './' and m.get('scope') == './' and m.get('background_color') == '#FAFAFA'
          and sorted(i['sizes'] + i.get('purpose', '') for i in m.get('icons', [])) == ['192x192', '512x512', '512x512maskable'])
    check('install: every icon loads', bool(m) and all(pg.evaluate(f"fetch('{i['src']}').then(r => r.ok && r.headers.get('content-type').startsWith('image/png'))") for i in m['icons']))
    c.close()

def offline(b):
    c, pg = online_visit(b)
    check('offline: the worker is active, at sw.js', pg.evaluate('navigator.serviceWorker.getRegistration().then(r => r && r.active ? r.active.scriptURL : "")').endswith('/sw.js'))
    urls = pg.evaluate(CACHED)
    check('offline: the page, its code and styles, and the icons are cached', '/index.html' in urls and '/icons/icon-192.png' in urls
          and any(u.startswith('/assets/index-') and u.endswith('.js') for u in urls) and any(u.endswith('.css') for u in urls))
    pg.reload(); pg.wait_for_selector('.hero')
    c.set_offline(True); pg.reload()
    try: pg.wait_for_selector('.hero', timeout=10000)
    except Exception: pass
    pg.wait_for_timeout(300)
    check('offline: Home opens with no connection, and says so', pg.locator('#sync').count() == 1 and pg.inner_text('#sync') == 'Offline, changes will sync')
    titles = []
    if pg.locator('.hero').count():
        for name in ('history', 'insights', 'settings'): tab(pg, name); pg.wait_for_timeout(200); titles.append(pg.inner_text('#screen-title'))
    check('offline: every tab opens', titles == ['History', 'Insights', 'Settings'])
    c.close()

def switchover_and_updates(b):
    real = open(SW, encoding='utf-8').read()
    try:
        # Switch-over day: the live app's worker and its caches are replaced
        open(SW, 'w', encoding='utf-8').write(OLD_WORKER)
        c, pg = online_visit(b); pg.wait_for_timeout(1000)
        before = pg.evaluate('caches.keys()')
        open(SW, 'w', encoding='utf-8').write(real)   # the new app's worker is published at the same address
        pg.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update())'); pg.wait_for_timeout(3000)
        check('switch-over: the old worker and its cache are replaced', before == ['shared-expenses-v6'] and pg.evaluate(WORKER) == 'new'
              and not any(k.startswith('shared-expenses-v') for k in pg.evaluate('caches.keys()')))
        c.set_offline(True); pg.reload(); pg.wait_for_selector('.hero', timeout=10000)
        check('switch-over: afterwards the app still opens offline', pg.locator('.hero').count() == 1)
        c.close()
        # Updates wait for a quiet moment
        c, pg = online_visit(b); pg.reload(); pg.wait_for_selector('.hero'); pg.wait_for_timeout(500)
        pg.evaluate('window.__marker = 1'); start_add(pg); keys(pg, '12')
        open(SW, 'a', encoding='utf-8').write('\n// a newer version\n')
        pg.evaluate('navigator.serviceWorker.getRegistration().then(r => r.update())'); pg.wait_for_timeout(2500)
        check('updates: a new version waits while Add is open', pg.evaluate('navigator.serviceWorker.getRegistration().then(r => !!r.waiting)')
              and pg.evaluate('window.__marker') == 1 and pg.inner_text('#amt') == '$12')
        close_sheet(pg); pg.wait_for_timeout(2500)
        check('updates: …and applies once Add closes', pg.evaluate('window.__marker') is None and pg.locator('.hero').count() == 1
              and pg.evaluate('navigator.serviceWorker.getRegistration().then(r => !r.waiting)'))
        c.close()
    finally:
        open(SW, 'w', encoding='utf-8').write(real)

def syncing(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('sync: nothing shows when everything is saved', pg.locator('#sync').count() == 1 and pg.inner_text('#sync') == ''
          and pg.get_attribute('#sync', 'aria-live') == 'polite')
    pg.evaluate('window.__pending = true'); fs_batch(pg, [exp_row('e1', 500, 'p1')])
    check('sync: Syncing… while a change is unconfirmed', pg.inner_text('#sync') == 'Syncing…')
    pg.evaluate('window.__pending = false'); fs_batch(pg, [exp_row('e2', 500, 'p1')])
    check('sync: …and clears once it’s saved', pg.inner_text('#sync') == '')
    c.close()

def run(b):
    install_hint(b)
