from harness import *
import datetime, urllib.parse

def md(d): return f"{d:%b} {d.day}"

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    pg.click('[data-act=profile]')
    check('venmo: Getting paid section', pg.inner_text('label[for=p-venmo]') == 'Your Venmo username'
          and pg.inner_text('#p-venmo-help') == 'The part after @. Kyle’s phone uses this to pay or request from you.')
    pg.fill('#p-venmo', 'a b'); pg.click('[data-act=venmo-save]')
    check('venmo: invalid username error', pg.inner_text('#p-venmo-err') == 'Use 5–30 letters, numbers, dashes, or underscores'
          and pg.get_attribute('#p-venmo', 'aria-invalid') == 'true' and 'p-venmo-err' in pg.get_attribute('#p-venmo', 'aria-describedby')
          and pg.evaluate('document.activeElement.id') == 'p-venmo')
    # Review Focus 1: a partner's profile update doesn't wipe what's typed
    pg.fill('#p-venmo', '@Test-Us'); fs_write(pg, 'config/profile-kyle', {'emoji': '🐶', 'updatedAt': 1})
    check('venmo: typing survives a partner update', pg.input_value('#p-venmo') == '@Test-Us')
    pg.fill('#p-venmo', '@Test-User_1'); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(100)
    check('venmo: saved without @', st(pg)['config/profile-bre']['venmo'] == 'Test-User_1' and pg.inner_text('#toast span') == 'Venmo username saved.'
          and pg.input_value('#p-venmo') == 'Test-User_1')
    pg.fill('#p-venmo', ''); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(100)
    check('venmo: cleared', st(pg)['config/profile-bre']['venmo'] is None and pg.inner_text('#toast span') == 'Venmo username removed.')
    pg.click('[data-act=close]')
    c.close()
    today = datetime.date.today()
    note = urllib.parse.quote(f'Shared expenses, {md(today)}', safe='')
    block = "document.addEventListener('click', e => { if (e.target.closest('a[data-act=venmo]')) e.preventDefault(); }, true)"
    c = new_ctx(b); pg = open_app(c); login(pg); pg.evaluate("sessionStorage.setItem('__persist', '1')")
    start_add(pg); keys(pg, '100'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('[data-act=settle]')
    check('venmo: no username yet', 'Kyle hasn’t added a Venmo username yet. They can add it in Profile.' in pg.inner_text('#s-venmo'))
    pg.keyboard.press('Escape')
    fs_write(pg, 'config/profile-kyle', {'venmo': 'Kyle-Test'})
    pg.click('[data-act=settle]')
    check('venmo: pay link', pg.inner_text('a[data-act=venmo]') == 'Pay Kyle $50.00 on Venmo'
          and pg.get_attribute('a[data-act=venmo]', 'href') == f'https://venmo.com/Kyle-Test?txn=pay&amount=50.00&note={note}'
          and pg.get_attribute('a[data-act=venmo]', 'target') == '_blank')
    pg.evaluate(block); pg.click('a[data-act=venmo]')
    p = pg.evaluate("JSON.parse(localStorage.getItem('venmoPending'))")
    check('venmo: remembers the payment it opened', p['net'] == 5000 and p['count'] == 1 and p['txn'] == 'pay')
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    check('venmo: asks after returning', pg.inner_text('#v-ask p') == 'Did the Venmo payment go through?'
          and pg.evaluate('document.activeElement.id') == 'v-ask' and not pg.is_visible('#layer .dock'))
    pg.click('[data-act=venmo-no]'); pg.wait_for_timeout(50)
    check('venmo: Not yet changes nothing', pg.locator('a[data-act=venmo]').count() == 1 and pg.is_visible('#layer .dock')
          and pg.evaluate("localStorage.getItem('venmoPending') || ''") == '' and not [k for k in st(pg) if k.startswith('settlements/')])
    # Review Focus 2: stale and mismatched entries are dropped silently
    pg.evaluate("localStorage.setItem('venmoPending', JSON.stringify({net: 5000, count: 1, at: Date.now() - 3*3600e3, txn: 'pay'}))")
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    check('venmo: older than 2 hours is ignored', pg.locator('#v-ask').count() == 0 and pg.evaluate("localStorage.getItem('venmoPending') || ''") == '')
    pg.evaluate("localStorage.setItem('venmoPending', JSON.stringify({net: 4000, count: 1, at: Date.now(), txn: 'pay'}))")
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    check('venmo: a changed balance is ignored', pg.locator('#v-ask').count() == 0)
    # Review Focus 3: asks again after the app is reopened
    pg.click('a[data-act=venmo]'); pg.reload(); pg.wait_for_selector('.hero'); pg.wait_for_timeout(300)
    check('venmo: asks again after reopening', pg.is_visible('#v-ask') and pg.inner_text('#layer-title') == 'Settle up')
    pg.click('[data-act=venmo-yes]'); pg.wait_for_timeout(150)
    sets = [v for k, v in st(pg).items() if k.startswith('settlements/')]
    check('venmo: Yes records the settle-up', len(sets) == 1 and sets[0].get('method') == 'venmo' and sets[0]['amountCents'] == 5000
          and all(e['settled'] for e in expenses(pg)) and pg.inner_text('#toast span') == 'Settled. Fresh start.')
    open_history(pg)
    check('venmo: History says via Venmo', ', via Venmo' in pg.inner_text('#app .rows'))
    go_home(pg)
    # The person owed gets a request link
    fs_write(pg, 'config/profile-bre', {'venmo': 'Bre-Test'})
    start_add(pg); keys(pg, '100'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.evaluate("sessionStorage.removeItem('__persist')"); logout(pg); login(pg, 'kyle')
    pg.click('[data-act=settle]')
    check('venmo: request link for the person owed', pg.inner_text('a[data-act=venmo]') == 'Request $50.00 from Bre on Venmo'
          and pg.get_attribute('a[data-act=venmo]', 'href') == f'https://venmo.com/Bre-Test?txn=charge&amount=50.00&note={note}')
    pg.evaluate(block); pg.click('a[data-act=venmo]'); pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    check('venmo: request wording', pg.inner_text('#v-ask p') == 'Did the Venmo request get paid?')
    pg.click('[data-act=venmo-no]'); pg.keyboard.press('Escape')
    # Review Focus 5: even balance has no Venmo link
    start_add(pg); keys(pg, '100'); set_payer(pg, 'bre'); next_step(pg); save_at_store(pg, 'target'); pg.wait_for_timeout(100)
    pg.click('[data-act=settle]')
    check('venmo: no link when even', pg.locator('a[data-act=venmo]').count() == 0 and pg.inner_text('#s-venmo').strip() == '')
    c.close()
    # Final review I-1 and I-2
    block = "document.addEventListener('click', e => { if (e.target.closest('a[data-act=venmo]')) e.preventDefault(); }, true)"
    c = new_ctx(b); pg = open_app(c); login(pg); pg.evaluate(block)
    fs_write(pg, 'config/profile-kyle', {'venmo': 'Kyle-Test'})
    start_add(pg); keys(pg, '100'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('[data-act=settle]'); pg.click('a[data-act=venmo]')
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    fs_write(pg, 'expenses/new1', {'amountCents': 3000, 'payer': 'kyle', 'merchant': 'Target', 'category': 'Other', 'date': '2026-10-01',
                                   'split': 'half', 'settled': False, 'createdBy': 'kyle', 'createdAt': 5})
    check('venmo: a new expense withdraws the question', pg.locator('#v-ask').count() == 0
          and 'The balance changed. Check it and try again.' in pg.inner_text('#s-venmo') and not [k for k in st(pg) if k.startswith('settlements/')])
    pg.keyboard.press('Escape')
    # the partner settles everything while the question is up
    pg.click('[data-act=settle]'); pg.click('a[data-act=venmo]')
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    ids = [k.split('/')[1] for k, v in st(pg).items() if k.startswith('expenses/') and not v.get('settled')]
    pg.evaluate("([sdk, ids]) => import(sdk + 'firebase-firestore.js').then(m => { const b = m.writeBatch(); ids.forEach(id => b.update(m.doc({}, 'expenses', id), {settled: true})); return b.commit(); })", [SDK, ids])
    pg.wait_for_timeout(100)
    check('venmo: already settled elsewhere closes it quietly', pg.evaluate("document.getElementById('layer').hidden")
          and pg.inner_text('#toast span') == 'Already settled up.' and not [k for k in st(pg) if k.startswith('settlements/')])
    # I-2: coming back while doing something else leaves that screen alone
    start_add(pg); keys(pg, '100'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('[data-act=settle]'); pg.click('a[data-act=venmo]'); pg.keyboard.press('Escape')
    start_add(pg); keys(pg, '42')
    pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
    check('venmo: return check never interrupts another screen', pg.inner_text('#layer-title') == 'Add expense' and pg.inner_text('#amt') == '$42'
          and pg.evaluate("localStorage.getItem('venmoPending') || ''") != '')
    c.close()

