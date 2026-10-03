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
def current_payer(pg): return pg.evaluate("document.querySelector('input[name=payer]:checked').value")
def set_payer(pg, who): pg.check(f'input[name=payer][value={who}]')
def next_step(pg): pg.click('[data-act=next]'); pg.wait_for_timeout(30)
def save_at_store(pg, store_id):
    pg.fill('#w-q', ''); pg.check(f'input[name=store][value="{store_id}"]'); pg.click('#w-save'); pg.wait_for_timeout(100)
def save_new_store(pg, name, category):
    pg.fill('#w-q', name); pg.wait_for_timeout(50); pg.check('input[name=store][value=__new__]'); pg.wait_for_timeout(50)
    pg.select_option('#w-cat', category); pg.click('#w-save'); pg.wait_for_timeout(100)
def open_details(pg): pg.click('[data-act=toggle-opts]')
def set_split(pg, v): pg.check(f'input[name=o-split][value={v}]')
def go_home(pg): pg.click('[data-act=home]'); pg.wait_for_timeout(50)
def open_history(pg): pg.click('[data-act=history]'); pg.wait_for_timeout(50)
def open_account(pg): open_history(pg)
def leave_account(pg): go_home(pg)
