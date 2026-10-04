from web_harness import *
import re

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'history')
    check('history: two tabs, Settle-ups first', pg.evaluate(
        "[...document.querySelectorAll('[role=tab]')].map(t => t.textContent + (t.getAttribute('aria-selected') === 'true' ? '*' : '')).join()") == 'Settle-ups*,Activity')
    check('history: no settle-ups yet', 'No settle-ups yet' in pg.inner_text('main'))
    pg.click('[data-act=h-activity]'); pg.wait_for_timeout(150)
    check('history: Activity is in the address, focus stays on the tab', pg.evaluate('location.hash') == '#/history/activity'
          and pg.evaluate('document.activeElement.dataset.act') == 'h-activity')
    check('history: empty activity', 'Changes to expenses will show up here.' in pg.inner_text('main'))
    check('history: the activity note', pg.inner_text('#activity-note') == 'Shared by both of you. Entries can’t be edited or deleted.')
    tab(pg, 'home')
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt'); pg.fill('#e-amt', '25'); pg.fill('#e-store', 'Target')
    pg.click('[data-act=e-save]'); pg.wait_for_timeout(150)
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt'); pg.click('[data-act=e-delete]'); pg.click('[data-act=e-delete]'); pg.wait_for_timeout(150)
    pg.evaluate("location.hash = '#/history/activity'"); pg.wait_for_timeout(200)
    lines = pg.evaluate("[...document.querySelectorAll('.act .t')].map(e => e.textContent)")
    check('history: activity sentences, newest first', lines == [
        'Alex deleted $25.00 at Target',
        'Alex changed Costco: amount $45.12 → $25.00, store Costco → Target',
        'Alex added $45.12 at Costco'])
    check('history: grouped under Today, with times', pg.inner_text('main section h2') == 'Today'
          and re.search(r'\d:\d\d [AP]M', pg.inner_text('.act .s')) is not None)
    check('history: no Show more under 100', pg.locator('[data-act=more-activity]').count() == 0)
    fs_batch(pg, [(f'activity/x{i:03d}', {'at': 1000 + i, 'by': 'p2', 'action': 'add', 'summary': {'amountCents': 100, 'merchant': 'Costco', 'payer': 'p2'}})
                  for i in range(100)])
    pg.wait_for_timeout(200)
    check('history: Show more at 100', pg.locator('.act').count() == 100 and pg.locator('[data-act=more-activity]').count() == 1)
    pg.click('[data-act=more-activity]'); pg.wait_for_timeout(250)
    check('history: Show more loads the rest', pg.locator('.act').count() == 103 and pg.locator('[data-act=more-activity]').count() == 0)
    # Settle-ups written by the live app use `${id}Half` fields; the list only needs the line and its details
    fs_write(pg, 'settlements/s1', {'date': '2026-09-30', 'createdAt': 2, 'from': 'p1', 'to': 'p2', 'amountCents': 37744, 'count': 2,
                                    'p1Half': 4512, 'p2Half': 0, 'p1Full': 0, 'p2Full': 40000, 'method': 'venmo'})
    fs_write(pg, 'settlements/s0', {'date': '2026-08-31', 'createdAt': 1, 'from': None, 'to': None, 'amountCents': 0, 'count': 1,
                                    'p1Half': 500, 'p2Half': 500, 'p1Full': 0, 'p2Full': 0})
    pg.click('[data-act=h-settle]'); pg.wait_for_timeout(150)
    check('history: Settle-ups is the plain History address', pg.evaluate('location.hash') == '#/history')
    check('history: settle-ups, newest first', pg.evaluate("[...document.querySelectorAll('#settle-list .t')].map(e => e.textContent)")
          == ['Alex paid Sam $377.44', 'Closed even'])
    check('history: settle-up details', pg.evaluate("[...document.querySelectorAll('#settle-list .s')].map(e => e.textContent)")
          == ['Sep 30, 2026, 2 expenses, via Venmo', 'Aug 31, 2026, 1 expense'])
    fs_batch(pg, [
        ('expenses/d1', {'amountCents': 4512, 'payer': 'p1', 'merchant': 'Costco', 'category': 'Groceries', 'date': '2026-09-29', 'split': 'half',
                         'settled': True, 'settlementId': 's1', 'createdBy': 'p1', 'createdAt': 5}),
        ('expenses/d2', {'amountCents': 40000, 'payer': 'p2', 'merchant': 'Target', 'category': 'Gifts & occasions', 'date': '2026-09-30', 'split': 'full',
                         'settled': True, 'settlementId': 's1', 'createdBy': 'p2', 'createdAt': 6})])
    pg.click('[data-act=detail][data-id=s1]'); pg.wait_for_timeout(250)
    check('detail: titled by its date, focus on the title', pg.inner_text('#layer-title') == 'Settled Sep 30, 2026'
          and pg.evaluate('document.activeElement.id') == 'layer-title' and pg.evaluate('location.hash') == '#/history/settle/s1')
    math = pg.evaluate("[...document.querySelectorAll('.math .r')].map(r => r.innerText.replace(/\\s+/g, ' ').trim())")
    check('detail: the math', math == ['Sam paid, split 50/50 $0.00', 'Alex paid, split 50/50 $45.12', 'Half the difference $22.56 to Alex',
                                       'Owed in full to Sam $400.00', 'Alex pays Sam $377.44'])
    check('detail: its expenses, newest first, read-only', pg.evaluate("[...document.querySelectorAll('#d-list .t')].map(e => e.textContent)") == ['Target', 'Costco']
          and pg.locator('#d-list button').count() == 0)
    pg.click('[data-act=close]'); pg.wait_for_timeout(250)
    check('detail: Back returns to the list and the row', not sheet_open(pg) and pg.evaluate('location.hash') == '#/history'
          and pg.evaluate('document.activeElement.dataset.id') == 's1')
    pg.click('[data-act=detail][data-id=s0]'); pg.wait_for_timeout(250)
    check('detail: an even period', pg.evaluate("[...document.querySelectorAll('.math .r')].at(-1).innerText.replace(/\\s+/g, ' ').trim()") == 'You’re even $0.00'
          and 'No expenses found.' in pg.inner_text('#d-list'))
    close_sheet(pg)
    c.close()
