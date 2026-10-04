from harness import *
import datetime

def md(d): return f"{d:%b} {d.day}"

def run(b):
    today = datetime.date.today()
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: store warning', pg.is_visible('#dup') and pg.inner_text('#dup-msg') == f'You added $45.12 at Costco on {md(today)}. Add this one too?'
          and pg.evaluate('document.activeElement.id') == 'dup-msg' and len(expenses(pg)) == 1)
    pg.click('[data-act=dup-cancel]')
    check('dupes: Don’t add keeps the form', not pg.is_visible('#dup') and pg.inner_text('#layer-title') == 'Where was it?' and len(expenses(pg)) == 1)
    pg.click('#w-save'); pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(100)
    check('dupes: Add anyway saves', len(expenses(pg)) == 2)
    start_add(pg); keys(pg, '45.13'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: different amount, no warning', len(expenses(pg)) == 3)
    for gap, warn in ((4, False), (3, True)):
        d = today - datetime.timedelta(days=gap)
        start_add(pg); keys(pg, '45.12'); next_step(pg); open_details(pg); pg.fill('#o-date', d.isoformat()); save_at_store(pg, 'costco')
        check(f'dupes: {gap} days apart → warning {warn}', pg.is_visible('#dup') == warn)
        if warn: pg.keyboard.press('Escape')
    c.close()
    # alias: an expense logged under an old name counts
    c = new_ctx(b); pg = open_app(c); login(pg)
    fs_write(pg, 'merchants/costco-old', {'name': 'Costco Old', 'hidden': True, 'mergedInto': 'costco'})
    fs_write(pg, 'expenses/fx1', {'amountCents': 4512, 'payer': 'kyle', 'merchant': 'Costco Old', 'category': 'Groceries', 'date': today.isoformat(),
                                  'split': 'half', 'settled': False, 'createdBy': 'kyle', 'createdAt': 1})
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('dupes: match through an alias', pg.inner_text('#dup-msg') == f'Kyle added $45.12 at Costco on {md(today)}. Add this one too?')
    pg.keyboard.press('Escape')
    # bills, including after a settle-up
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: first bill saves', len([e for e in expenses(pg) if e.get('billId') == 'water']) == 1)
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: bill warning', pg.inner_text('#dup-msg') == f'You added $280.00 for Water on {md(today)}. Add this one too?')
    pg.click('[data-act=key][data-k=back]')
    check('dupes: changing the amount hides it', not pg.is_visible('#dup'))
    pg.keyboard.press('Escape')
    pg.click('[data-act=settle]'); pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); next_step(pg); pg.wait_for_timeout(150)
    check('dupes: settled bill this month still counts', pg.is_visible('#dup'))
    pg.click('[data-act=dup-ok]'); pg.wait_for_timeout(150)
    check('dupes: bill Add anyway saves', len([e for e in expenses(pg) if e.get('billId') == 'water' and not e.get('settled')]) == 1 and pg.evaluate("document.getElementById('layer').hidden"))
    # Review Focus 4: a slow bill check must not warn about a bill the user moved away from
    start_add(pg); pg.click('[data-act=bill][data-id=water]')
    pg.evaluate("window.__slowGetDocs = 300"); next_step(pg); pg.click('[data-act=clear-bill]'); pg.wait_for_timeout(500)
    pg.evaluate("window.__slowGetDocs = 0")
    check('dupes: bill check ignores a changed bill', not pg.is_visible('#dup') and pg.inner_text('#layer-title') == 'Add expense')
    c.close()
