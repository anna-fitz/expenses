from web_harness import *
import datetime

def run(b):
    month = datetime.date.today().strftime('%B')
    # ---- Step 1 and the Bills drawer ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('add: primary button on Home', pg.inner_text('[data-act=add]') == 'Add expense')
    start_add(pg)
    check('add1: sheet named by its title, focus on it', pg.get_attribute('#layer', 'role') == 'dialog' and pg.get_attribute('#layer', 'aria-labelledby') == 'layer-title'
          and pg.inner_text('#layer-title') == 'Add expense' and pg.title() == 'Add expense · Expenses' and pg.evaluate('document.activeElement.id') == 'layer-title')
    check('add1: no step counter', pg.locator('#layer .step').count() == 0)
    check('add1: the amount is the hero', pg.inner_text('#amt-label') == 'Amount' and pg.inner_text('#amt') == '$0'
          and pg.evaluate("getComputedStyle(document.getElementById('amt')).fontSize") == '56px'
          and pg.evaluate("document.querySelector('[aria-labelledby=amt-label]') !== null"))
    check('add1: no paid-by and no bill chips on step 1', pg.locator('input[name=payer]').count() == 0 and pg.locator('[data-act=bill]').count() == 0
          and pg.inner_text('[data-act=pick-bill]') == 'Pick a bill')
    check('add1: Cancel at the top, only Next at the bottom', pg.inner_text('#layer header [data-act=close]') == 'Cancel'
          and pg.locator('#layer .dock [data-act=close]').count() == 0 and pg.inner_text('#layer .dock').strip() == 'Next')
    next_step(pg)
    check('add1: empty amount error, linked', pg.inner_text('#amt-err') == 'Enter an amount' and pg.inner_text('#layer-title') == 'Add expense'
          and 'amt-err' in pg.get_attribute('[aria-labelledby=amt-label]', 'aria-describedby'))
    keys(pg, '12')
    check('add1: typing clears the error', pg.locator('#amt-err').count() == 0 and pg.inner_text('#amt') == '$12')
    k1, k2, k4 = (pg.locator(f'[data-act=key][data-k="{k}"]').bounding_box() for k in '124')
    check('keypad: iPhone sizing', 44 <= k1['height'] <= 48 and 5 <= k2['x'] - (k1['x'] + k1['width']) <= 7 and 5 <= k4['y'] - (k1['y'] + k1['height']) <= 7)
    check('keypad: regular-weight 28px digits, edge to edge', pg.evaluate(
        "(() => { const s = getComputedStyle(document.querySelector('[data-act=key][data-k=\"1\"]')); return [s.fontSize, s.fontWeight]; })()") == ['28px', '400']
          and abs(pg.locator('#layer .keys').bounding_box()['width'] - 390) <= 1)
    pg.click('[data-act=pick-bill]'); pg.wait_for_selector('#bills'); pg.wait_for_timeout(100)
    check('bills: the drawer explains bills', pg.inner_text('#bills-help') == 'Bills are your recurring shared costs, kept separate from everyday expenses. '
          'Each one fills in its usual amount. Change it on the keypad if this month’s is different.'
          and pg.get_attribute('#bills', 'aria-describedby') == 'bills-help')
    check('bills: a named drawer, focus inside', pg.get_attribute('#bills', 'role') == 'dialog' and pg.get_attribute('#bills', 'aria-labelledby') == 'bills-title'
          and pg.inner_text('#bills-title') == 'Bills' and focused_in(pg, 'bills'))
    check('bills: in order, with usual amounts', pg.evaluate("[...document.querySelectorAll('#bills [data-act=bill]')].map(e => e.dataset.id).join()")
          == 'electricity,internet,gas-bill,water,pool-service,gardener' and '$80.00' in pg.inner_text('#bills [data-act=bill][data-id=internet]'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    check('bills: Escape closes only the drawer, focus back on Pick a bill', pg.locator('#bills').count() == 0 and sheet_open(pg)
          and pg.evaluate('document.activeElement.dataset.act') == 'pick-bill')
    pick_bill(pg, 'internet')
    check('bills: picking fills the amount and closes, focus on Change', pg.locator('#bills').count() == 0 and pg.inner_text('#amt') == '$80.00'
          and 'For Internet' in pg.inner_text('.billfor') and pg.evaluate('document.activeElement.dataset.act') == 'clear-bill')
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5'); pg.wait_for_timeout(700)
    check('add1: the bill amount stays editable and is announced', pg.inner_text('#amt') == '$80.5' and pg.inner_text('#announcer') == 'Amount $80.5')
    pg.click('[data-act=clear-bill]'); pg.wait_for_timeout(100)
    check('add1: Change clears the bill and the amount', pg.inner_text('#amt') == '$0' and pg.locator('[data-act=pick-bill]').count() == 1
          and pg.evaluate('document.activeElement.dataset.act') == 'pick-bill')
    pg.focus('#layer-title'); pg.keyboard.type('7.5'); pg.keyboard.press('Backspace')
    check('add1: the keyboard types into the amount', pg.inner_text('#amt') == '$7.')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('sheet: Escape closes, focus returns, title restored', not sheet_open(pg) and pg.evaluate('document.activeElement.dataset.act') == 'add'
          and pg.title() == 'Expenses' and pg.evaluate('location.hash') in ('', '#/'))
    start_add(pg); pg.go_back(); pg.wait_for_timeout(200)
    check('sheet: the phone’s Back closes it without saving', not sheet_open(pg) and len(expenses(pg)) == 0)
    start_add(pg); pg.click('[data-act=close]'); pg.wait_for_timeout(200)
    check('sheet: Cancel closes it', not sheet_open(pg) and pg.evaluate('location.hash') != '#/add')
    pg.evaluate("location.hash = '#/add'"); pg.wait_for_timeout(200)
    check('sheet: a link opens Add', sheet_open(pg) and pg.inner_text('#layer-title') == 'Add expense')
    pg.click('[data-act=close]'); pg.wait_for_timeout(200)
    check('sheet: closing a linked sheet lands on Home', not sheet_open(pg) and pg.evaluate('location.hash') == '#/')
    c.close()
    # ---- Step 2 and review ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg)
    ctx = pg.inner_text('#layer .ctx')
    check('add2: title and context line', pg.inner_text('#layer-title') == 'Where was it?' and pg.evaluate('document.activeElement.id') == 'layer-title'
          and ctx.startswith('$45.12') and 'Edit amount' in ctx and 'paid by' not in ctx.lower())
    names = store_names(pg)
    check('add2: Store label, stores A–Z without the bills, Back and Next', pg.inner_text('label[for=w-q]') == 'Store' and len(names) == 17
          and names == sorted(names, key=str.lower) and not set(names) & {'Electricity', 'Internet', 'Gas bill', 'Water', 'Pool service', 'Gardener'}
          and pg.inner_text('[data-act=back]') == 'Back' and pg.inner_text('[data-act=next]') == 'Next')
    check('add2: Cancel at the top', pg.inner_text('#layer header [data-act=close]') == 'Cancel')
    next_step(pg)
    check('add2: pick-a-store error', pg.inner_text('#w-err') == 'Pick a store first' and pg.evaluate('document.activeElement.name') == 'store'
          and pg.inner_text('#layer-title') == 'Where was it?')
    pg.check('input[name=store][value=costco]')
    check('add2: the selected line', pg.locator('#w-err').count() == 0 and pg.inner_text('#w-selected').startswith('Costco selected'))
    pg.click('input[name=store][value=costco]'); pg.wait_for_timeout(80)
    check('add2: tapping the selected store unselects it', checked(pg, 'store') is None and pg.locator('#w-selected').count() == 0)
    pg.check('input[name=store][value=costco]'); pg.click('[data-act=clear-store]'); pg.wait_for_timeout(100)
    check('add2: Clear unselects, focus goes to the search', checked(pg, 'store') is None and pg.evaluate('document.activeElement.id') == 'w-q')
    pg.check('input[name=store][value=costco]'); pg.fill('#w-q', 'tar'); pg.wait_for_timeout(80)
    check('add2: filter, and a hidden selection is cleared', store_values(pg) == ['__new__', 'target'] and pg.locator('#w-selected').count() == 0)
    pg.fill('#w-q', ''); pg.wait_for_timeout(50)
    check('add2: and stays cleared', checked(pg, 'store') is None)
    pg.fill('#w-q', ' water '); pg.wait_for_timeout(80)
    check('add2: typing a bill name points to Pick a bill, never adds it as a store', store_values(pg) == []
          and pg.inner_text('#w-bill').startswith('Water is a bill.') and pg.inner_text('[data-act=to-bills]') == 'Log it with Pick a bill')
    pg.click('[data-act=to-bills]'); pg.wait_for_selector('#bills'); pg.wait_for_timeout(150)
    check('add2: which goes to step 1 with the Bills drawer open', pg.inner_text('#layer-title') == 'Add expense' and pg.locator('#bills').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250); next_step(pg); pg.fill('#w-q', ''); pg.wait_for_timeout(50)
    pg.check('input[name=store][value=ralphs]'); pg.focus('input[name=store][value=ralphs]')
    fs_write(pg, 'merchants/zzz-cafe', {'name': 'Zzz Cafe', 'category': 'Coffee', 'count': 1})
    check('add2: a live update keeps selection and focus', checked(pg, 'store') == 'ralphs' and pg.evaluate('document.activeElement.value') == 'ralphs'
          and pg.locator('input[name=store][value=zzz-cafe]').count() == 1)
    pg.click('#layer .ctx [data-act=back-amount]'); pg.wait_for_timeout(50)
    check('add2: Edit amount keeps the amount', pg.inner_text('#amt') == '$45.12')
    next_step(pg)
    check('add2: going back keeps the store', checked(pg, 'store') == 'ralphs')
    above = lambda a_, b_: pg.locator(a_).bounding_box()['y'] < pg.locator(b_).bounding_box()['y']
    check('add2: no note on the store step; Details above the tiles, with its summary', pg.locator('[data-act=add-note], #w-note, #o-note').count() == 0
          and pg.inner_text('[data-act=details]') == 'Details' and above('[data-act=details]', '#w-list') and above('#w-sum', '#w-list')
          and pg.inner_text('#w-sum') == 'Today · split 50/50 · usual category')
    open_details(pg)
    check('details: the note comes first', pg.inner_text('label[for=o-note]') == 'Note' and pg.get_attribute('#o-note', 'placeholder') == 'What was it? e.g., dog food'
          and above('#o-note', '#payer-set'))
    pg.fill('#o-note', 'Paper towels'); details_done(pg); next_step(pg)
    check('review: title, hero amount, where', pg.inner_text('#layer-title') == 'Look good?' and pg.evaluate('document.activeElement.id') == 'layer-title'
          and pg.inner_text('#rv-amt') == '$45.12' and pg.inner_text('#rv-at') == 'at Ralphs'
          and pg.evaluate("getComputedStyle(document.getElementById('rv-amt')).fontSize") == '56px')
    check('review: rows, with the note right after the store', [rv(pg, k) for k in ('store', 'note', 'amount', 'payer', 'split', 'date', 'category')]
          == ['Ralphs', 'Paper towels', '$45.12', 'You', '50/50, Sam owes $22.56', 'Today', 'Groceries']
          and pg.evaluate("[...document.querySelectorAll('#review [data-row]')].map(r => r.dataset.row).slice(0, 2).join()") == 'store,note'
          and pg.locator('[data-row=covers]').count() == 0)
    check('review: rows are named buttons', pg.get_attribute('[data-act=rv-payer]', 'aria-label') == 'Paid by, You')
    check('review: Cancel at the top', pg.inner_text('#layer header [data-act=close]') == 'Cancel')
    pg.click('[data-act=rv-note]'); pg.wait_for_selector('#details'); pg.wait_for_timeout(100)
    check('details: the Note row starts in the note', pg.evaluate('document.activeElement.id') == 'o-note' and pg.input_value('#o-note') == 'Paper towels')
    pg.fill('#o-note', 'Paper towels, 2 pack'); details_done(pg)
    check('review: the edited note shows, focus back on its row', rv(pg, 'note') == 'Paper towels, 2 pack'
          and pg.evaluate('document.activeElement.dataset.act') == 'rv-note')
    check('review: Back and Log expense', pg.inner_text('[data-act=back]') == 'Back' and pg.inner_text('[data-act=log]') == 'Log expense')
    log_it(pg)
    e = expenses(pg)
    check('review: logged', len(e) == 1 and e[0]['merchant'] == 'Ralphs' and e[0]['amountCents'] == 4512 and e[0]['payer'] == 'p1' and e[0]['split'] == 'half'
          and e[0]['category'] == 'Groceries' and e[0]['note'] == 'Paper towels, 2 pack' and e[0]['createdBy'] == 'p1' and e[0]['settled'] is False and not sheet_open(pg))
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    a = activity(pg)
    check('review: logged with a fixed activity id', len(a) == 1 and a[0]['id'] == f'add-{eid}' and a[0]['action'] == 'add' and a[0]['by'] == 'p1'
          and a[0]['summary'] == {'amountCents': 4512, 'merchant': 'Ralphs', 'payer': 'p1'})
    check('review: store use counted', st(pg)['merchants/ralphs']['count'] == 39)
    check('review: toast with Undo and Edit', 'Logged ✅ $45.12 at Ralphs' in toast_text(pg)
          and pg.locator('[data-toast=undo]').count() == 1 and pg.locator('[data-toast=edit]').count() == 1)
    start_add(pg)
    check('sheet: a lingering toast stays out of the way while a sheet is open', not pg.is_visible('[data-toast=undo]'))
    close_sheet(pg)
    check('sheet: and comes back after it closes', pg.is_visible('[data-toast=undo]'))
    toast_btn(pg, 'undo')
    check('review: Undo leaves no trace', len(expenses(pg)) == 0 and len(activity(pg)) == 0 and 'Removed.' in toast_text(pg))
    start_add(pg); keys(pg, '1'); next_step(pg); pg.check('input[name=store][value=costco]'); next_step(pg)
    pg.click('#layer header [data-act=close]'); pg.wait_for_timeout(250)
    check('review: Cancel closes without logging', not sheet_open(pg) and len(expenses(pg)) == 0)
    # ---- Each review row goes to the right place and comes back ----
    start_add(pg); keys(pg, '20'); next_step(pg); pg.check('input[name=store][value=costco]'); next_step(pg)
    pg.click('[data-act=rv-amount]'); pg.wait_for_timeout(80)
    check('review: Amount goes back to step 1, still with Cancel at the top', pg.inner_text('#layer-title') == 'Add expense' and pg.inner_text('#amt') == '$20'
          and pg.locator('#layer header [data-act=close]').count() == 1 and pg.locator('#layer .dock [data-act=close]').count() == 0)
    keys(pg, '5'); next_step(pg)
    check('review: Next comes straight back', pg.inner_text('#layer-title') == 'Look good?' and rv(pg, 'amount') == '$205.00')
    pg.click('[data-act=rv-store]'); pg.wait_for_timeout(80)
    check('review: Store goes back to step 2', pg.inner_text('#layer-title') == 'Where was it?' and checked(pg, 'store') == 'costco')
    pg.check('input[name=store][value=target]'); next_step(pg)
    check('review: and comes back', pg.inner_text('#layer-title') == 'Look good?' and rv(pg, 'store') == 'Target' and rv(pg, 'category') == 'Home & household')
    pg.click('[data-act=rv-payer]'); pg.wait_for_selector('#details'); pg.wait_for_timeout(100)
    check('details: a named drawer that starts on the row’s field', pg.get_attribute('#details', 'role') == 'dialog'
          and pg.inner_text('#details-title') == 'Details' and pg.evaluate('document.activeElement.name') == 'payer' and pg.inner_text('#payer-set legend') == 'Paid by')
    pg.check('input[name=payer][value=p2]')
    check('details: the split help follows the payer', pg.inner_text('#o-split-help') == 'Alex owes $102.50.')
    details_done(pg)
    check('details: Done closes, focus back on the row, values follow', pg.locator('#details').count() == 0
          and pg.evaluate('document.activeElement.dataset.act') == 'rv-payer' and rv(pg, 'payer') == 'Sam' and rv(pg, 'split') == '50/50, Alex owes $102.50')
    pg.click('[data-act=rv-split]'); pg.wait_for_selector('#details'); pg.wait_for_timeout(100)
    check('details: the Split row starts on the split', pg.evaluate('document.activeElement.name') == 'o-split')
    set_split(pg, 'full'); details_done(pg)
    pg.click('[data-act=rv-date]'); pg.wait_for_selector('#details'); pg.wait_for_timeout(100)
    check('details: the Date row starts on the date', pg.evaluate('document.activeElement.id') == 'o-date')
    pg.fill('#o-date', '2026-09-01'); pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    check('details: Escape closes only the drawer', pg.locator('#details').count() == 0 and sheet_open(pg)
          and rv(pg, 'split') == 'Owed in full' and rv(pg, 'date') == 'Sep 1')
    pg.click('[data-act=rv-category]'); pg.wait_for_selector('#details'); pg.wait_for_timeout(100)
    check('details: Category row starts there; A–Z with the store’s default marked', pg.evaluate('document.activeElement.id') == 'o-cat'
          and options(pg, '#o-cat') == [x + ' (default for Target)' if x == 'Home & household' else x for x in ORDER] and pg.input_value('#o-cat') == 'Home & household')
    pg.select_option('#o-cat', 'Gifts & occasions'); details_done(pg)
    check('review: the category follows', rv(pg, 'category') == 'Gifts & occasions')
    pg.click('[data-act=back]'); pg.wait_for_timeout(80)
    check('review: Back goes to the store step', pg.inner_text('#layer-title') == 'Where was it?')
    next_step(pg); log_it(pg)
    t = [x for x in expenses(pg) if x['merchant'] == 'Target']
    check('review: everything changed from review is logged', len(t) == 1 and t[0]['amountCents'] == 20500 and t[0]['payer'] == 'p2'
          and t[0]['split'] == 'full' and t[0]['date'] == '2026-09-01' and t[0]['category'] == 'Gifts & occasions')
    # ---- Details before a store; a new store; Enter in the search ----
    start_add(pg); keys(pg, '9'); next_step(pg); open_details(pg)
    check('details: before a store, Store’s default comes first', options(pg, '#o-cat') == ['Store’s default'] + ORDER and pg.input_value('#o-cat') == ''
          and pg.evaluate('document.activeElement.id') == 'details-title')
    details_done(pg)
    check('details: focus returns to the Details button', pg.evaluate('document.activeElement.dataset.act') == 'details')
    pg.fill('#w-q', 'Blue Bottle'); pg.wait_for_timeout(50)
    check('add2: new-store tile first', store_values(pg)[0] == '__new__' and 'Add Blue Bottle as a new store' in pg.inner_text('#w-list'))
    pg.check('input[name=store][value=__new__]'); pg.wait_for_timeout(50)
    check('add2: category picker labelled, A–Z with Other last', pg.inner_text('label[for=w-cat]') == 'Category for Blue Bottle'
          and options(pg, '#w-cat') == ['Choose a category'] + ORDER)
    next_step(pg)
    check('add2: category required', pg.inner_text('#w-err') == 'Pick a category for Blue Bottle' and pg.get_attribute('#w-cat', 'aria-invalid') == 'true'
          and pg.evaluate('document.activeElement.id') == 'w-cat' and pg.inner_text('#layer-title') == 'Where was it?')
    pg.select_option('#w-cat', 'Coffee'); next_step(pg)
    check('review: a new store and its category; no note yet', rv(pg, 'store') == 'Blue Bottle' and rv(pg, 'category') == 'Coffee'
          and rv(pg, 'note') == 'Add a note' and pg.get_attribute('[data-act=rv-note]', 'aria-label') == 'Note, Add a note')
    log_it(pg)
    m = st(pg).get('merchants/blue-bottle', {})
    check('review: a new store is learned', m.get('category') == 'Coffee' and m.get('count') == 1 and any(x['merchant'] == 'Blue Bottle' for x in expenses(pg)))
    start_add(pg); keys(pg, '3'); next_step(pg); pg.fill('#w-q', 'aldi'); pg.press('#w-q', 'Enter'); pg.wait_for_timeout(50)
    check('add2: Enter selects the exact match', checked(pg, 'store') == 'aldi')
    pg.press('#w-q', 'Enter'); pg.wait_for_timeout(120)
    check('add2: Enter again goes to review, nothing logged yet', pg.inner_text('#layer-title') == 'Look good?' and not any(x['merchant'] == 'Aldi' for x in expenses(pg)))
    log_it(pg)
    check('review: Aldi logged', any(x['merchant'] == 'Aldi' for x in expenses(pg)))
    c.close()
    # ---- Bills ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); pick_bill(pg, 'electricity'); next_step(pg); pg.wait_for_timeout(150)
    check('bills: Next goes straight to review', pg.inner_text('#layer-title') == 'Look good?' and pg.inner_text('#rv-at') == 'for Electricity'
          and rv(pg, 'store') == 'Electricity' and pg.locator('[data-act=rv-store]').count() == 0
          and rv(pg, 'payer') == 'Sam' and rv(pg, 'category') == 'Utilities' and rv(pg, 'covers') == month)
    pg.click('[data-act=rv-note]'); pg.wait_for_selector('#details'); pg.fill('#o-note', 'Summer rate'); details_done(pg)
    check('bills: a bill can have a note', rv(pg, 'note') == 'Summer rate')
    pg.click('[data-act=back]'); pg.wait_for_timeout(80)
    check('bills: Back goes to step 1', pg.inner_text('#layer-title') == 'Add expense' and 'For Electricity' in pg.inner_text('.billfor'))
    next_step(pg); pg.wait_for_timeout(150); log_it(pg)
    el = [x for x in expenses(pg) if x.get('billId') == 'electricity']
    check('bills: logged with its payer and month', el and el[0]['payer'] == 'p2' and el[0]['amountCents'] == 64555 and el[0]['merchant'] == 'Electricity'
          and el[0]['covers'] == month and el[0]['category'] == 'Utilities' and el[0]['note'] == 'Summer rate' and not sheet_open(pg))
    check('bills: toast', 'Logged ✅ $645.55 for Electricity' in toast_text(pg))
    start_add(pg); pick_bill(pg, 'water')
    for _ in range(4): pg.click('[data-act=key][data-k=back]')
    keys(pg, '00'); next_step(pg); pg.wait_for_timeout(150); log_it(pg)
    check('bills: says when it’s more than usual', 'That’s more than the usual $280.00.' in toast_text(pg))
    c.close()
    # ---- Review Focus 1, refused writes, the second member ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '5'); next_step(pg); pg.check('input[name=store][value=costco]'); next_step(pg); pg.dblclick('[data-act=log]'); pg.wait_for_timeout(250)
    check('add: a double tap logs once', len(expenses(pg)) == 1)
    pg.evaluate('window.__deny = true'); start_add(pg); keys(pg, '6'); next_step(pg); save_at_store(pg, 'target'); pg.wait_for_timeout(100)
    check('add: a refused save says so', 'security rules' in toast_text(pg))
    pg.evaluate('window.__deny = false')
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg, 'b_messy')
    start_add(pg); keys(pg, '4'); next_step(pg); pg.check('input[name=store][value=costco]'); next_step(pg)
    check('add: the second member pays by default', rv(pg, 'payer') == 'You')
    log_it(pg)
    check('add: …and is saved as the payer', [x['payer'] for x in expenses(pg)] == ['p2'])
    c.close()
    # ---- Review Focus 5: step 1 fits on short phones ----
    for vp in ((375, 667), (320, 568)):
        c = new_ctx(b, 'light', vp); pg = open_app(c); login(pg); start_add(pg); pg.wait_for_timeout(300)
        dock = pg.locator('#layer .dock').bounding_box()
        check(f'add1: {vp[0]}x{vp[1]} fits without scrolling', pg.evaluate("(() => { const s = document.querySelector('#layer .scroll'); return s.scrollHeight <= s.clientHeight + 1; })()")
              and pg.locator('#amt-label').bounding_box()['y'] >= 0 and dock['y'] + dock['height'] <= vp[1] + 1
              and pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        c.close()
    # Final review: each step opens at its top, even after scrolling the store list on a small phone
    c = new_ctx(b, 'light', (320, 568)); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '12'); next_step(pg); pg.check('input[name=store][value=target]'); pg.wait_for_timeout(100)
    scrolled = pg.evaluate("document.querySelector('#layer .scroll').scrollTop") > 0
    next_step(pg); pg.wait_for_timeout(100)
    check('review: opens at its top after a scrolled store list', scrolled and pg.evaluate("document.querySelector('#layer .scroll').scrollTop") == 0
          and pg.locator('#rv-amt').bounding_box()['y'] >= pg.locator('#layer .scroll').bounding_box()['y'])
    c.close()
