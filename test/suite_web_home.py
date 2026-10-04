from web_harness import *
import datetime

def run(b):
    today = datetime.date.today(); ago = lambda n: (today - datetime.timedelta(days=n)).isoformat()
    exp = lambda **k: dict({'payer': 'p1', 'merchant': 'Costco', 'category': 'Groceries', 'date': today.isoformat(), 'split': 'half',
                            'settled': False, 'createdBy': 'p1', 'createdAt': 1}, **k)
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('home: even and empty, new voice', pg.inner_text('.hero .who') == 'You’re even'
          and pg.inner_text('.hero .sub') == 'Perfectly balanced, as all things should be ⚖️'
          and 'It’s quiet… too quiet 👀' in pg.inner_text('main') and 'pops up on Sam’s phone' in pg.inner_text('main'))
    fs_write(pg, 'expenses/k1', exp(amountCents=120000, payer='p2', createdBy='p2', createdAt=3))
    check('home: balance', pg.inner_text('.hero .who') == 'You owe Sam' and pg.inner_text('.hero .amt') == '$600.00')
    check('home: legend', 'You paid $0.00' in pg.inner_text('.legend') and 'Sam paid $1,200.00' in pg.inner_text('.legend'))
    check('home: bar is labelled', pg.get_attribute('[role=img]', 'aria-label') == 'You paid $0.00, Sam paid $1,200.00')
    fs_write(pg, 'expenses/b1', exp(amountCents=100, date=ago(61), createdAt=2))
    check('home: reminder', pg.inner_text('#nudge p') == 'It’s been 61 days and the balance is over $500.'
          and 'Settle-up o’clock ⏰' in pg.inner_text('#nudge'))
    check('home: grouped by day', pg.evaluate("[...document.querySelectorAll('.group h2')].map(h => h.textContent)")[0] == 'Today')
    fs_write(pg, 'expenses/f1', exp(amountCents=2500, split='full', merchant='Old Navy', createdAt=4))
    check('home: owed in full badge', 'Owed in full' in pg.inner_text('[data-id=f1]'))
    fs_write(pg, 'merchants/costco', {'hidden': True, 'mergedInto': 'trader-joes'})
    check('home: aliased store shows its current name', pg.inner_text('[data-id=k1] .t') == "Trader Joe's")
    check('home: amounts use tabular digits', 'tabular-nums' in pg.evaluate("getComputedStyle(document.querySelector('.hero .amt')).fontVariantNumeric"))
    fs_write(pg, 'config/profile-p2', {'color': 'teal'})
    check('home: legacy color key renders', pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--person-b-l').trim()").lower() == '#1baf7a')
    fs_write(pg, 'expenses/long', exp(amountCents=999999999, merchant='A really very long store name that goes on and on and on', createdAt=5))
    pg.set_viewport_size({'width': 320, 'height': 640}); pg.wait_for_timeout(100)
    check('home: no horizontal overflow at 320px', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    c.close()
    c = new_ctx(b); pg = open_app(c); pg.evaluate("sessionStorage.setItem('__persist', '1')"); login(pg)
    fs_write(pg, 'expenses/k1', exp(amountCents=1000, payer='p2'))
    pg.reload(); pg.wait_for_selector('.hero'); pg.wait_for_timeout(200)
    check('home: data is still there after reopening', pg.inner_text('.hero .amt') == '$5.00')
    c.close()
