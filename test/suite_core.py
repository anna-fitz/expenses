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
    check('balance $690.22', pg.inner_text('.hero .amt') == '$690.22' and pg.inner_text('.hero .who') == 'You owe Kyle')
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
    check('Firebase SDK cached at install', pg.evaluate(f'caches.open("{cache_name}").then(c=>c.keys()).then(k=>k.filter(r=>r.url.includes("gstatic.com/firebasejs/12.19.0/")).length)') == 3)
    c.close()
