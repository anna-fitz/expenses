from web_harness import *
from suite_axe import scan as _scan

def scan(pg, name):
    _scan(pg, name)
    small = small_targets(pg)
    check(f'targets 44px: {name}', not small)
    if small: print(f'--- small targets: {name} ---\n' + '\n'.join(small))
    labels = off_scale_labels(pg)
    check(f'label text 16px: {name}', not labels)
    if labels: print(f'--- off-scale labels: {name} ---\n' + '\n'.join(labels))
    off = off_scale_buttons(pg)
    check(f'button text 16px: {name}', not off)
    if off: print(f'--- off-scale buttons: {name} ---\n' + '\n'.join(off))

def run(b):
    for scheme in ('light', 'dark'):
        c = new_ctx(b, scheme); pg = open_app(c, onboarded=False)
        scan(pg, f'web {scheme} sign in')
        pg.fill('#l-email', ACC['a']); pg.fill('#l-pass', 'wrong'); pg.click('#l-btn'); pg.wait_for_timeout(150)
        scan(pg, f'web {scheme} sign in error')
        login_to(pg, 'a', '#onboarding'); scan(pg, f'web {scheme} onboarding privacy')
        pg.click('#onboarding summary'); scan(pg, f'web {scheme} onboarding full details')
        pg.click('[data-act=ob-continue]'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(50); scan(pg, f'web {scheme} onboarding password error')
        pg.click('[data-act=pw-skip]'); pg.wait_for_selector('.hero'); pg.wait_for_timeout(150)
        scan(pg, f'web {scheme} home empty')
        fs_write(pg, 'expenses/k1', {'amountCents': 120000, 'payer': 'p2', 'merchant': 'Costco', 'category': 'Groceries', 'date': '2026-08-01',
                                      'split': 'full', 'settled': False, 'createdBy': 'p2', 'createdAt': 1})
        scan(pg, f'web {scheme} home with reminder and rows')
        for name in ('history', 'insights', 'settings'): tab(pg, name); scan(pg, f'web {scheme} {name}')
        pg.click('[data-act=privacy]'); pg.wait_for_timeout(100); scan(pg, f'web {scheme} privacy page')
        c.close()
