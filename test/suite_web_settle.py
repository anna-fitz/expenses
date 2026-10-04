from web_harness import *
from urllib.parse import quote
import datetime as _dt   # `from web_harness import *` skips underscore names

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('home: no Settle up with nothing to settle', pg.locator('[data-act=settle]').count() == 0)
    d1, d2 = ago(5), ago(4)
    fs_batch(pg, [exp_row('e1', 4512, 'p1', 'half', d1), exp_row('e2', 40000, 'p2', 'full', d2)])
    fs_write(pg, 'config/profile-p2', {'venmo': 'sam-test'})
    check('home: Settle up in the balance card', pg.locator('[data-act=settle]').count() == 1 and pg.locator('.hero [data-act=settle]').count() == 1
          and pg.inner_text('[data-act=settle]') == 'Settle up')
    open_settle(pg)
    check('settle: a sheet named Settle up, Cancel on top, no bottom bar', pg.inner_text('#layer-title') == 'Settle up' and pg.title() == 'Settle up · Expenses'
          and pg.evaluate('location.hash') == '#/settle' and pg.inner_text('#layer header [data-act=close]') == 'Cancel' and pg.locator('#layer .dock').count() == 0)
    check('settle: who, how much, and the period', pg.inner_text('#s-who') == 'You owe Sam' and pg.inner_text('#s-amt') == '$377.44'
          and pg.evaluate("getComputedStyle(document.getElementById('s-amt')).fontSize") == '56px'
          and pg.inner_text('#s-period') == f'2 expenses, {md(d1)} – {md(d2)}')
    check('settle: the breakdown starts collapsed', pg.get_attribute('[data-act=how]', 'aria-expanded') == 'false' and not pg.is_visible('#s-math'))
    pg.click('[data-act=how]')
    rows = pg.evaluate("[...document.querySelectorAll('#s-math .r')].map(r => r.innerText.replace(/\\s+/g, ' ').trim())")
    check('settle: How we got this opens the math', pg.get_attribute('[data-act=how]', 'aria-expanded') == 'true' and rows == [
        'Sam paid, split 50/50 $0.00', 'Alex paid, split 50/50 $45.12', 'Half the difference $22.56 to Alex', 'Owed in full to Sam $400.00', 'Alex pays Sam $377.44'])
    check('settle: How we got this lines up with the text above it', pg.evaluate("(([a, b]) => { const x = document.querySelector(a), s = getComputedStyle(x); return Math.abs(x.getBoundingClientRect().left + parseFloat(s.paddingLeft) - document.querySelector(b).getBoundingClientRect().left) < 1; })", ['[data-act=how]', '#s-who']))
    note = f'Shared expenses, {md(d1)} – {md(d2)}'
    check('settle: Pay Sam on Venmo, the main button', pg.inner_text('a[data-act=venmo]') == 'Pay Sam on Venmo'
          and pg.get_attribute('a[data-act=venmo]', 'href') == f"https://venmo.com/sam-test?txn=pay&amount=377.44&note={quote(note, safe=chr(39) + '-_.!~*()')}"
          and pg.get_attribute('a[data-act=venmo]', 'target') == '_blank' and pg.get_attribute('a[data-act=venmo]', 'rel') == 'noopener'
          and pg.inner_text('[data-act=settle-other]') == 'Paid another way')
    pg.click('[data-act=settle-other]'); pg.wait_for_selector('#settle-confirm'); pg.wait_for_timeout(150)
    check('settle: the confirm drawer', pg.inner_text('#settle-confirm-title') == 'Did you pay Sam $377.44?'
          and pg.inner_text('#settle-confirm-help') == 'This starts a fresh balance. All 2 expenses move to History, where you can always see them.'
          and pg.inner_text('[data-act=settle-yes]') == 'Yes, mark as paid' and pg.inner_text('[data-act=settle-no]') == 'Not yet')
    pg.click('[data-act=settle-no]'); pg.wait_for_timeout(250)
    check('settle: Not yet keeps everything', pg.locator('#settle-confirm').count() == 0 and sheet_open(pg) and settlements(pg) == []
          and pg.evaluate('document.activeElement.dataset.act') == 'settle-other')
    pg.click('[data-act=settle-other]'); pg.wait_for_selector('#settle-confirm'); pg.dblclick('[data-act=settle-yes]'); pg.wait_for_timeout(300)
    s = settlements(pg)
    check('settle: a double tap records once', len(s) == 1)
    sid = s[0]['id'] if s else None
    want = {'date': _dt.date.today().isoformat(), 'by': 'p1', 'from': 'p1', 'to': 'p2', 'amountCents': 37744, 'p1Half': 4512, 'p2Half': 0, 'p1Full': 0,
            'p2Full': 40000, 'count': 2, 'periodStart': d1, 'periodEnd': d2}
    check('settle: the record matches the current app’s', s and all(s[0].get(k) == v for k, v in want.items()) and 'method' not in s[0])
    act = [x for x in activity(pg) if x['action'] == 'settle']
    check('settle: logged', len(act) == 1 and act[0]['settlementId'] == sid and act[0]['summary'] == {'amountCents': 37744, 'from': 'p1', 'to': 'p2'})
    check('settle: every expense moves to History', all(st(pg)[f'expenses/{i}'].get('settled') is True and st(pg)[f'expenses/{i}'].get('settlementId') == sid for i in ('e1', 'e2')))
    check('settle: the sheet closes, fresh slate', not sheet_open(pg) and 'Settled! Fresh slate ✨' in toast_text(pg)
          and pg.inner_text('.hero .amt') == '$0.00' and pg.locator('[data-act=settle]').count() == 0)
    c.close()
    # ---- You're owed; no username; even ----
    c = new_ctx(b); pg = open_app(c); login(pg, 'b_messy')
    fs_batch(pg, [exp_row('e1', 1000, 'p2')]); fs_write(pg, 'config/profile-p1', {'venmo': 'alex-test'})
    open_settle(pg)
    check('settle: you’re owed, so Request from Alex', pg.inner_text('#s-who') == 'Alex owes you' and pg.inner_text('a[data-act=venmo]') == 'Request from Alex on Venmo'
          and pg.get_attribute('a[data-act=venmo]', 'href').startswith('https://venmo.com/alex-test?txn=charge&amount=5.00&note='))
    pg.click('[data-act=settle-other]'); pg.wait_for_selector('#settle-confirm')
    check('settle: the drawer asks the other way round', pg.inner_text('#settle-confirm-title') == 'Did Alex pay you $5.00?'
          and pg.inner_text('#settle-confirm-help') == 'This starts a fresh balance. The 1 expense moves to History, where you can always see it.')
    # Escape passes to the drawer a moment after it opens (the dialog library re-ranks its layers); a person never presses that fast.
    # In that moment the sheet now ignores Escape instead of closing (Sheet.tsx), so nothing is lost either way.
    pg.wait_for_function("document.getElementById('settle-confirm')?.contains(document.activeElement)"); pg.wait_for_timeout(250)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    check('settle: Escape closes only the drawer', pg.locator('#settle-confirm').count() == 0 and sheet_open(pg))
    fs_write(pg, 'config/profile-p1', {'venmo': None}); pg.wait_for_timeout(100)
    check('settle: without their username, Paid another way is the main button', pg.locator('a[data-act=venmo]').count() == 0
          and pg.inner_text('#s-novenmo') == 'Alex hasn’t added a Venmo username yet. They can add it in Profile.' and pg.locator('[data-act=settle-other]').count() == 1)
    fs_batch(pg, [exp_row('e2', 1000, 'p1')]); pg.wait_for_timeout(150)
    check('settle: the sheet updates live; even means Close this period', pg.inner_text('#s-who') == 'You’re even ⚖️' and pg.inner_text('#s-amt') == '$0.00'
          and pg.locator('a[data-act=venmo], #s-novenmo').count() == 0 and pg.inner_text('[data-act=settle-other]') == 'Close this period')
    pg.click('[data-act=settle-other]'); pg.wait_for_selector('#settle-confirm')
    check('settle: closing an even period', pg.inner_text('#settle-confirm-title') == 'Close this period?' and pg.inner_text('[data-act=settle-yes]') == 'Yes, close it')
    pg.click('[data-act=settle-yes]'); pg.wait_for_timeout(300)
    s = settlements(pg)
    check('settle: an even period is recorded with no one paying', len(s) == 1 and s[0]['from'] is None and s[0]['to'] is None and s[0]['amountCents'] == 0)
    c.close()
    # ---- The reminder card; the other phone; refused writes; a link with nothing to settle ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    fs_batch(pg, [exp_row('e1', 1000, 'p2', 'half', ago(70))])
    check('home: the reminder’s Settle up replaces the card’s', pg.locator('[data-act=settle]').count() == 1 and pg.locator('#nudge [data-act=settle]').count() == 1)
    open_settle(pg)
    fs_batch(pg, [('expenses/e1', {'settled': True, 'settlementId': 'other'})]); pg.wait_for_timeout(300)
    check('settle: the other phone settled first', not sheet_open(pg) and 'Already settled up.' in toast_text(pg) and settlements(pg) == [])
    fs_batch(pg, [exp_row('e2', 1000, 'p2')])
    open_settle(pg); pg.evaluate('window.__deny = true')
    pg.click('[data-act=settle-other]'); pg.wait_for_selector('#settle-confirm'); pg.click('[data-act=settle-yes]'); pg.wait_for_timeout(300)
    check('settle: a refused write says so', 'security rules' in toast_text(pg))
    pg.evaluate('window.__deny = false')
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg)
    pg.evaluate("location.hash = '#/settle'"); pg.wait_for_timeout(300)
    check('settle: a link with nothing to settle lands on Home', not sheet_open(pg) and pg.evaluate('location.hash') == '#/' and 'Already settled up.' not in toast_text(pg))
    c.close()
    # ---- Coming back from Venmo ----
    no_follow = lambda pg: pg.evaluate("document.querySelector('a[data-act=venmo]').addEventListener('click', e => e.preventDefault())")
    come_back = lambda pg: (pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"), pg.wait_for_timeout(300))
    pending = lambda pg: pg.evaluate("JSON.parse(localStorage.getItem('venmoPending') || 'null')")
    c = new_ctx(b); pg = open_app(c); pg.evaluate("sessionStorage.setItem('__persist', '1')"); login(pg)
    fs_batch(pg, [exp_row('e1', 4512, 'p1', 'half', ago(5)), exp_row('e2', 40000, 'p2', 'full', ago(4))]); fs_write(pg, 'config/profile-p2', {'venmo': 'sam-test'})
    open_settle(pg); no_follow(pg); pg.click('a[data-act=venmo]'); pg.wait_for_timeout(100)
    p = pending(pg)
    check('venmo: tapping it notes the payment on this phone', p and p['net'] == 37744 and p['count'] == 2 and p['txn'] == 'pay')
    come_back(pg)
    check('venmo: coming back asks, with focus on the question', pg.inner_text('#v-ask').startswith('Did the Venmo payment go through?')
          and pg.get_attribute('#v-ask', 'role') == 'status' and pg.evaluate('document.activeElement.id') == 'v-ask'
          and pg.locator('a[data-act=venmo], [data-act=settle-other]').count() == 0)
    pg.click('[data-act=venmo-no]'); pg.wait_for_timeout(150)
    check('venmo: Not yet clears it and shows the buttons again', pending(pg) is None and pg.locator('#v-ask').count() == 0
          and pg.locator('a[data-act=venmo]').count() == 1 and settlements(pg) == [])
    check('venmo: after Not yet, focus is on the Venmo button', pg.evaluate('document.activeElement.dataset.act') == 'venmo')
    no_follow(pg); pg.click('a[data-act=venmo]'); close_sheet(pg)
    pg.reload(); pg.wait_for_selector('#v-ask', timeout=10000); pg.wait_for_timeout(200)
    check('venmo: reopening the app within 2 hours asks again', sheet_open(pg) and pg.inner_text('#layer-title') == 'Settle up')
    pg.dblclick('[data-act=venmo-yes]'); pg.wait_for_timeout(300)
    s = settlements(pg)
    check('venmo: a double tap on Yes records once, via Venmo', len(s) == 1 and s[0].get('method') == 'venmo' and pending(pg) is None and not sheet_open(pg))
    tab(pg, 'history'); pg.wait_for_timeout(150)
    check('venmo: History says via Venmo', ', via Venmo' in pg.inner_text('#settle-list'))
    tab(pg, 'home')
    fs_batch(pg, [exp_row('e3', 2000, 'p1')])
    pg.evaluate("localStorage.setItem('venmoPending', JSON.stringify({net: -1000, count: 1, at: Date.now() - 3 * 3600e3, txn: 'charge'}))")
    come_back(pg)
    check('venmo: a stale note is cleared silently', not sheet_open(pg) and pending(pg) is None)
    open_settle(pg); no_follow(pg); pg.click('a[data-act=venmo]'); come_back(pg)
    check('venmo: a request asks the request question', pg.inner_text('#v-ask').startswith('Did the Venmo request get paid?'))
    fs_batch(pg, [exp_row('e4', 600, 'p2')]); pg.wait_for_timeout(250)
    check('venmo: a changed balance withdraws the question', pg.locator('#v-ask').count() == 0
          and pg.inner_text('#v-changed') == 'The balance changed. Check it and try again.' and pg.get_attribute('#v-changed', 'role') == 'alert'
          and pending(pg) is None and len(settlements(pg)) == 1)
    check('venmo: the balance-changed message is plain text, not an error color', pg.evaluate("getComputedStyle(document.getElementById('v-changed')).color === getComputedStyle(document.getElementById('layer-title')).color"))
    no_follow(pg); pg.click('a[data-act=venmo]'); close_sheet(pg)
    start_add(pg); come_back(pg)
    check('venmo: never interrupts Add', pg.inner_text('#layer-title') == 'Add expense' and pg.locator('#v-ask').count() == 0)
    close_sheet(pg); pg.wait_for_timeout(300)
    check('venmo: …and asks once you’re back on Home', sheet_open(pg) and pg.locator('#v-ask').count() == 1)
    close_sheet(pg)
    c.close()
