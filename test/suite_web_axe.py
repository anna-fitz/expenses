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
        c = new_ctx(b, scheme); pg = open_app(c); login(pg)
        start_add(pg); scan(pg, f'web {scheme} add amount')
        next_step(pg); scan(pg, f'web {scheme} add amount error')
        pg.click('[data-act=pick-bill]'); pg.wait_for_selector('#bills'); pg.wait_for_timeout(150); scan(pg, f'web {scheme} bills drawer')
        pg.click('#bills [data-act=bill][data-id=water]'); pg.wait_for_timeout(250); scan(pg, f'web {scheme} add bill picked')
        next_step(pg); pg.wait_for_timeout(200); scan(pg, f'web {scheme} review a bill')
        pg.click('[data-act=back]'); pg.wait_for_timeout(80); pg.click('[data-act=clear-bill]'); keys(pg, '45.12'); next_step(pg); scan(pg, f'web {scheme} add store')
        next_step(pg); pg.wait_for_timeout(50); scan(pg, f'web {scheme} add store error')
        pg.check('input[name=store][value=costco]'); scan(pg, f'web {scheme} add store selected')
        open_details(pg); scan(pg, f'web {scheme} details drawer'); details_done(pg)
        pg.fill('#w-q', 'Blue Bottle'); pg.check('input[name=store][value=__new__]'); next_step(pg); pg.wait_for_timeout(50)
        scan(pg, f'web {scheme} add new-store error')
        pg.select_option('#w-cat', 'Coffee'); pg.click('[data-act=add-note]'); pg.fill('#w-note', 'Beans'); next_step(pg); pg.wait_for_timeout(150); scan(pg, f'web {scheme} review')
        log_it(pg); pg.wait_for_timeout(100); scan(pg, f'web {scheme} home with the saved toast')
        start_add(pg); keys(pg, '45.12'); next_step(pg); pg.fill('#w-q', 'blue'); pg.check('input[name=store][value=blue-bottle]'); next_step(pg); pg.wait_for_timeout(150)
        scan(pg, f'web {scheme} duplicate warning on review')
        close_sheet(pg)
        eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
        pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt'); scan(pg, f'web {scheme} edit')
        pg.fill('#e-amt', ''); pg.click('[data-act=e-save]'); pg.click('[data-act=e-delete]'); pg.wait_for_timeout(50)
        scan(pg, f'web {scheme} edit error, delete armed')
        close_sheet(pg)
        fs_batch(pg, [('settlements/s1', {'date': '2026-09-30', 'createdAt': 2, 'from': 'p1', 'to': 'p2', 'amountCents': 37744, 'count': 1,
                                          'p1Half': 4512, 'p2Half': 0, 'p1Full': 0, 'p2Full': 40000}),
                      ('expenses/d1', {'amountCents': 4512, 'payer': 'p1', 'merchant': 'Costco', 'category': 'Groceries', 'date': '2026-09-29',
                                       'split': 'half', 'settled': True, 'settlementId': 's1', 'createdBy': 'p1', 'createdAt': 5})])
        tab(pg, 'history'); scan(pg, f'web {scheme} history settle-ups')
        pg.click('[data-act=detail][data-id=s1]'); pg.wait_for_timeout(250); scan(pg, f'web {scheme} settle-up details')
        close_sheet(pg)
        pg.click('[data-act=h-activity]'); pg.wait_for_timeout(200); scan(pg, f'web {scheme} activity')
        c.close()
