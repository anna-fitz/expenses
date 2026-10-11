from web_harness import *
import datetime

def md(d): return f"{d:%b} {d.day}"
def waters(pg): return sorted(e['amountCents'] for e in expenses(pg) if e.get('billId') == 'water')
def to_review(pg, amount, store):
    start_add(pg); keys(pg, amount); next_step(pg); pg.fill('#w-q', ''); pg.check(f'input[name=store][value="{store}"]'); next_step(pg); pg.wait_for_timeout(80)

def run(b):
    today = datetime.date.today()
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    to_review(pg, '45.12', 'costco')
    check('dupes: the warning shows on review', pg.locator('#dup').count() == 1 and pg.get_attribute('#dup', 'role') == 'alert'
          and pg.inner_text('#layer-title') == 'Look good?' and pg.inner_text('#dup-msg') == f'You added $45.12 at Costco on {md(today)}. Add this one too?'
          and pg.evaluate('document.activeElement.id') == 'dup-msg' and len(expenses(pg)) == 1)
    check('dupes: its buttons', pg.inner_text('[data-act=dup-cancel]') == 'Don’t add' and pg.inner_text('[data-act=dup-ok]') == 'Log anyway')
    pg.click('[data-act=log]'); pg.wait_for_timeout(100)
    check('dupes: Log expense doesn’t skip past the warning', len(expenses(pg)) == 1 and pg.evaluate('document.activeElement.id') == 'dup-msg')
    pg.click('[data-act=dup-cancel]'); pg.wait_for_timeout(100)
    check('dupes: Don’t add stays on review', pg.locator('#dup').count() == 0 and pg.inner_text('#layer-title') == 'Look good?'
          and len(expenses(pg)) == 1 and pg.evaluate('document.activeElement.dataset.act') == 'log')
    pg.click('[data-act=log]'); pg.wait_for_timeout(100)
    check('dupes: logging again asks again', pg.locator('#dup').count() == 1 and len(expenses(pg)) == 1)
    pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(150)
    check('dupes: Log anyway logs', len(expenses(pg)) == 2 and not sheet_open(pg))
    to_review(pg, '45.13', 'costco')
    check('dupes: a different amount, no warning', pg.locator('#dup').count() == 0)
    log_it(pg)
    for gap, warn in ((4, False), (3, True)):
        d = today - datetime.timedelta(days=gap)
        start_add(pg); keys(pg, '45.12'); next_step(pg); pg.check('input[name=store][value=costco]')
        open_details(pg); pg.fill('#o-date', d.isoformat()); details_done(pg); next_step(pg); pg.wait_for_timeout(100)
        check(f'dupes: {gap} days apart → warning {warn}', pg.locator('#dup').count() == (1 if warn else 0))
        if warn: close_sheet(pg)
        else: log_it(pg)
    to_review(pg, '45.12', 'costco')
    pg.click('[data-act=rv-date]'); pg.wait_for_selector('#details'); pg.fill('#o-date', (today - datetime.timedelta(days=10)).isoformat()); details_done(pg); pg.wait_for_timeout(100)
    check('dupes: changing the date on review re-checks', pg.locator('#dup').count() == 0)
    pg.click('[data-act=rv-date]'); pg.wait_for_selector('#details'); pg.fill('#o-date', today.isoformat()); details_done(pg); pg.wait_for_timeout(100)
    check('dupes: …and finds it again', pg.locator('#dup').count() == 1)
    pg.click('[data-act=back]'); pg.wait_for_timeout(100)
    check('dupes: Back hides the warning', pg.locator('#dup').count() == 0 and pg.inner_text('#layer-title') == 'Where was it?')
    close_sheet(pg)
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg)
    fs_write(pg, 'merchants/costco-old', {'name': 'Costco Old', 'hidden': True, 'mergedInto': 'costco'})
    fs_write(pg, 'expenses/fx1', {'amountCents': 4512, 'payer': 'p2', 'merchant': 'Costco Old', 'category': 'Groceries', 'date': today.isoformat(),
                                  'split': 'half', 'settled': False, 'createdBy': 'p2', 'createdAt': 1})
    to_review(pg, '45.12', 'costco')
    check('dupes: a match through an alias, named by who added it', pg.inner_text('#dup-msg') == f'Sam added $45.12 at Costco on {md(today)}. Add this one too?')
    close_sheet(pg)
    start_add(pg); pick_bill(pg, 'water'); next_step(pg); pg.wait_for_timeout(150); log_it(pg)
    check('dupes: the first bill logs', waters(pg) == [28000])
    start_add(pg); pick_bill(pg, 'water'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: bill warning on review', pg.inner_text('#dup-msg') == f'You added $280.00 for Water on {md(today)}. Add this one too?')
    close_sheet(pg)
    wid = [k for k, v in st(pg).items() if k.startswith('expenses/') and v.get('billId') == 'water'][0]
    fs_write(pg, wid, {'settled': True, 'settlementId': 's1'})
    start_add(pg); pick_bill(pg, 'water'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: a settled bill this month still counts', pg.locator('#dup').count() == 1)
    pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(150)
    check('dupes: bill Log anyway logs', waters(pg) == [28000, 28000] and not sheet_open(pg))
    # Review Focus 1 and 2: slow bill checks
    start_add(pg); pick_bill(pg, 'water'); pg.evaluate('window.__slowGetDocs = 300'); next_step(pg)
    check('dupes: Log expense shows it’s checking', pg.inner_text('[data-act=log]') == 'Checking…' and pg.get_attribute('[data-act=log]', 'aria-disabled') == 'true')
    pg.click('[data-act=log]'); pg.click('[data-act=back]'); pg.wait_for_timeout(500); pg.evaluate('window.__slowGetDocs = 0')
    check('dupes: a check ignores a screen you left', pg.locator('#dup').count() == 0 and pg.inner_text('#layer-title') == 'Add expense' and waters(pg) == [28000, 28000])
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: back on review, the corrected amount is checked', pg.locator('#dup').count() == 1 and rv(pg, 'amount') == '$280.50')
    pg.click('[data-act=back]'); pg.wait_for_timeout(80)
    pg.evaluate('window.__slowGetDocs = 300'); next_step(pg); close_sheet(pg); pg.wait_for_timeout(500); pg.evaluate('window.__slowGetDocs = 0')
    check('dupes: closing during a check logs nothing', not sheet_open(pg) and waters(pg) == [28000, 28000])
    c.close()
