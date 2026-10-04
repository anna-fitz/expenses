from web_harness import *
import datetime

def md(d): return f"{d:%b} {d.day}"
def waters(pg): return sorted(e['amountCents'] for e in expenses(pg) if e.get('billId') == 'water')

def run(b):
    today = datetime.date.today()
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: store warning', pg.locator('#dup').count() == 1 and pg.get_attribute('#dup', 'role') == 'alert'
          and pg.inner_text('#dup-msg') == f'You added $45.12 at Costco on {md(today)}. Add this one too?'
          and pg.evaluate('document.activeElement.id') == 'dup-msg' and len(expenses(pg)) == 1)
    pg.click('[data-act=dup-cancel]'); pg.wait_for_timeout(80)
    check('dupes: Don’t add keeps the form', pg.locator('#dup').count() == 0 and pg.inner_text('#layer-title') == 'Where was it?'
          and len(expenses(pg)) == 1 and pg.evaluate('document.activeElement.id') == 'w-save')
    pg.click('#w-save'); pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(150)
    check('dupes: Add anyway saves', len(expenses(pg)) == 2)
    start_add(pg); keys(pg, '45.13'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: a different amount, no warning', len(expenses(pg)) == 3)
    for gap, warn in ((4, False), (3, True)):
        d = today - datetime.timedelta(days=gap)
        start_add(pg); keys(pg, '45.12'); next_step(pg); open_details(pg); pg.fill('#o-date', d.isoformat()); save_at_store(pg, 'costco')
        check(f'dupes: {gap} days apart → warning {warn}', pg.locator('#dup').count() == (1 if warn else 0))
        if warn: close_sheet(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    pg.fill('#w-q', 'cost'); pg.wait_for_timeout(50)
    check('dupes: changing the search hides the warning', pg.locator('#dup').count() == 0)
    close_sheet(pg)
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg)
    fs_write(pg, 'merchants/costco-old', {'name': 'Costco Old', 'hidden': True, 'mergedInto': 'costco'})
    fs_write(pg, 'expenses/fx1', {'amountCents': 4512, 'payer': 'p2', 'merchant': 'Costco Old', 'category': 'Groceries', 'date': today.isoformat(),
                                  'split': 'half', 'settled': False, 'createdBy': 'p2', 'createdAt': 1})
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: a match through an alias, named by who added it', pg.inner_text('#dup-msg') == f'Sam added $45.12 at Costco on {md(today)}. Add this one too?')
    close_sheet(pg)
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: the first bill saves', waters(pg) == [28000])
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: bill warning', pg.inner_text('#dup-msg') == f'You added $280.00 for Water on {md(today)}. Add this one too?')
    pg.click('[data-act=key][data-k=back]')
    check('dupes: changing the amount hides it', pg.locator('#dup').count() == 0)
    close_sheet(pg)
    wid = [k for k, v in st(pg).items() if k.startswith('expenses/') and v.get('billId') == 'water'][0]
    fs_write(pg, wid, {'settled': True, 'settlementId': 's1'})
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: a settled bill this month still counts', pg.locator('#dup').count() == 1)
    pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(150)
    check('dupes: bill Add anyway saves', waters(pg) == [28000, 28000] and not sheet_open(pg))
    # Review Focus 4: slow checks
    start_add(pg); pg.click('[data-act=bill][data-id=water]')
    pg.evaluate('window.__slowGetDocs = 300'); next_step(pg); pg.click('[data-act=clear-bill]'); pg.wait_for_timeout(500)
    pg.evaluate('window.__slowGetDocs = 0')
    check('dupes: a check ignores a bill you moved away from', pg.locator('#dup').count() == 0 and pg.inner_text('#layer-title') == 'Add expense'
          and waters(pg) == [28000, 28000])
    close_sheet(pg)
    start_add(pg); pg.click('[data-act=bill][data-id=water]')
    pg.evaluate('window.__slowGetDocs = 300'); next_step(pg)
    check('dupes: Next shows it’s checking', pg.inner_text('[data-act=next]') == 'Checking…' and pg.get_attribute('[data-act=next]', 'aria-disabled') == 'true')
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5'); pg.wait_for_timeout(500)
    pg.evaluate('window.__slowGetDocs = 0')
    check('dupes: a stale check never saves the old amount', waters(pg) == [28000, 28000] and pg.locator('#dup').count() == 0
          and pg.inner_text('[data-act=next]') == 'Save Water, $280.50')
    next_step(pg); pg.wait_for_timeout(150)
    check('dupes: warning for the corrected amount', pg.locator('#dup').count() == 1)
    pg.keyboard.press('1'); pg.wait_for_timeout(80)
    check('dupes: typing hides the warning, focus stays in the sheet', pg.locator('#dup').count() == 0
          and pg.evaluate('document.activeElement.dataset.act') == 'next')
    pg.evaluate('window.__slowGetDocs = 300'); next_step(pg); close_sheet(pg); pg.wait_for_timeout(500); pg.evaluate('window.__slowGetDocs = 0')
    check('dupes: closing during a check saves nothing', not sheet_open(pg) and waters(pg) == [28000, 28000])
    c.close()
