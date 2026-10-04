from web_harness import *
import datetime

def run(b):
    month = datetime.date.today().strftime('%B')
    # ---- Step 1, the sheet itself ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('add: primary button on Home', pg.inner_text('[data-act=add]') == 'Add expense')
    start_add(pg)
    check('add1: sheet named by its title', pg.get_attribute('#layer', 'role') == 'dialog' and pg.get_attribute('#layer', 'aria-labelledby') == 'layer-title'
          and pg.inner_text('#layer-title') == 'Add expense' and pg.title() == 'Add expense · Expenses')
    check('add1: focus on the title', pg.evaluate('document.activeElement.id') == 'layer-title')
    check('add1: step marker', pg.inner_text('#layer .step') == 'Step 1 of 2')
    check('add1: visible Amount label, labelled group', pg.inner_text('#amt-label') == 'Amount' and pg.inner_text('#amt') == '$0'
          and pg.evaluate("document.querySelector('[aria-labelledby=amt-label]') !== null"))
    check('add1: hint', pg.inner_text('#amt-hint') == 'Type it in, or pick a bill.')
    check('add1: paid-by group, you first and checked', pg.inner_text('#payer-set legend') == 'Paid by' and 'Sam' in pg.inner_text('#payer-set')
          and pg.evaluate("[...document.querySelectorAll('input[name=payer]')].map(i => i.value + (i.checked ? '*' : '')).join()") == 'p1*,p2')
    check('add1: bills in order', pg.inner_text('#bills-h') == 'Bills'
          and pg.evaluate("[...document.querySelectorAll('[data-act=bill]')].map(e => e.dataset.id).join()") == 'electricity,internet,gas-bill,water,pool-service,gardener')
    check('add1: Next label', pg.inner_text('[data-act=next]') == 'Next: choose store')
    next_step(pg)
    check('add1: empty amount error, linked', pg.inner_text('#amt-err') == 'Enter an amount' and pg.inner_text('#layer-title') == 'Add expense'
          and 'amt-err' in pg.get_attribute('[aria-labelledby=amt-label]', 'aria-describedby'))
    pg.check('input[name=payer][value=p2]'); keys(pg, '12')
    check('add1: typing clears the error and keeps the payer', pg.locator('#amt-err').count() == 0 and checked(pg, 'payer') == 'p2' and pg.inner_text('#amt') == '$12')
    pg.check('input[name=payer][value=p1]'); pg.click('[data-act=bill][data-id=internet]'); pg.wait_for_timeout(50)
    check('add1: a bill fills its amount and usual payer', pg.inner_text('[data-act=next]') == 'Save Internet, $80.00' and pg.inner_text('#amt') == '$80.00'
          and checked(pg, 'payer') == 'p2' and 'For Internet' in pg.inner_text('.billfor') and pg.locator('#bills-h').count() == 0)
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5')
    check('add1: bill label follows edits', pg.inner_text('[data-act=next]') == 'Save Internet, $80.50')
    pg.wait_for_timeout(700)
    check('add1: amount announced', pg.inner_text('#announcer') == 'Amount $80.5')
    pg.click('[data-act=clear-bill]'); pg.wait_for_timeout(50)
    check('add1: Change clears the bill', pg.inner_text('#amt') == '$0' and checked(pg, 'payer') == 'p1' and pg.locator('#bills-h').count() == 1)
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
    # ---- Step 2, saving, Undo ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg)
    check('add2: question title and step', pg.inner_text('#layer-title') == 'Where was it?' and pg.inner_text('#layer .step') == 'Step 2 of 2'
          and pg.evaluate('document.activeElement.id') == 'layer-title' and pg.title() == 'Where was it? · Expenses')
    check('add2: context line', '$45.12, paid by you' in pg.inner_text('#layer .ctx'))
    check('add2: visible Store label', pg.inner_text('label[for=w-q]') == 'Store')
    names = store_names(pg)
    check('add2: all stores A–Z', len(names) == 23 and names == sorted(names, key=str.lower))
    check('add2: Save waits for a store', pg.inner_text('#w-save') == 'Choose a store')
    pg.click('#w-save'); pg.wait_for_timeout(50)
    check('add2: pick-a-store error', pg.inner_text('#w-err') == 'Pick a store first' and len(expenses(pg)) == 0
          and pg.evaluate('document.activeElement.name') == 'store')
    pg.check('input[name=store][value=costco]')
    check('add2: selecting does not save', len(expenses(pg)) == 0 and pg.locator('#w-err').count() == 0)
    check('add2: Save names the store', pg.inner_text('#w-save') == 'Save $45.12 at Costco')
    pg.fill('#w-q', 'tar'); pg.wait_for_timeout(50)
    check('add2: filter', store_values(pg) == ['__new__', 'target'])
    check('add2: a hidden selection is cleared', pg.inner_text('#w-save') == 'Choose a store')
    pg.fill('#w-q', ''); pg.wait_for_timeout(50)
    check('add2: and stays cleared', checked(pg, 'store') is None)
    pg.check('input[name=store][value=ralphs]'); pg.focus('input[name=store][value=ralphs]')
    fs_write(pg, 'merchants/zzz-cafe', {'name': 'Zzz Cafe', 'category': 'Coffee', 'count': 1})
    check('add2: a live update keeps selection and focus', checked(pg, 'store') == 'ralphs' and pg.evaluate('document.activeElement.value') == 'ralphs'
          and pg.locator('input[name=store][value=zzz-cafe]').count() == 1)
    pg.click('#layer .ctx [data-act=back-amount]'); pg.wait_for_timeout(50)
    check('add2: Edit amount keeps the amount', pg.inner_text('#amt') == '$45.12')
    next_step(pg)
    check('add2: going back keeps the store', checked(pg, 'store') == 'ralphs')
    pg.click('#w-save'); pg.wait_for_timeout(150)
    e = expenses(pg)
    check('add2: saved', len(e) == 1 and e[0]['merchant'] == 'Ralphs' and e[0]['amountCents'] == 4512 and e[0]['payer'] == 'p1'
          and e[0]['split'] == 'half' and e[0]['category'] == 'Groceries' and e[0]['createdBy'] == 'p1' and e[0]['settled'] is False and not sheet_open(pg))
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    a = activity(pg)
    check('add2: logged with a fixed id', len(a) == 1 and a[0]['id'] == f'add-{eid}' and a[0]['action'] == 'add' and a[0]['by'] == 'p1'
          and a[0]['summary'] == {'amountCents': 4512, 'merchant': 'Ralphs', 'payer': 'p1'})
    check('add2: store use counted', st(pg)['merchants/ralphs']['count'] == 39)
    check('add2: toast with Undo and Edit', 'Logged ✅ $45.12 at Ralphs' in toast_text(pg)
          and pg.locator('[data-toast=undo]').count() == 1 and pg.locator('[data-toast=edit]').count() == 1)
    check('add2: shows on Home', 'Ralphs' in pg.inner_text('main'))
    toast_btn(pg, 'undo')
    check('add2: Undo leaves no trace', len(expenses(pg)) == 0 and len(activity(pg)) == 0 and 'Removed.' in toast_text(pg))
    start_add(pg); keys(pg, '9'); next_step(pg); pg.fill('#w-q', 'Blue Bottle'); pg.wait_for_timeout(50)
    check('add2: new-store tile first', store_values(pg)[0] == '__new__' and 'Add Blue Bottle as a new store' in pg.inner_text('#w-list'))
    pg.check('input[name=store][value=__new__]'); pg.wait_for_timeout(50)
    check('add2: category select labelled', pg.inner_text('label[for=w-cat]') == 'Category for Blue Bottle')
    pg.click('#w-save'); pg.wait_for_timeout(50)
    check('add2: category required', pg.inner_text('#w-err') == 'Pick a category for Blue Bottle' and pg.get_attribute('#w-cat', 'aria-invalid') == 'true'
          and pg.evaluate('document.activeElement.id') == 'w-cat' and len(expenses(pg)) == 0)
    pg.select_option('#w-cat', 'Coffee'); pg.click('#w-save'); pg.wait_for_timeout(150)
    m = st(pg).get('merchants/blue-bottle', {})
    check('add2: new store saved and learned', m.get('category') == 'Coffee' and m.get('count') == 1 and [x['merchant'] for x in expenses(pg)] == ['Blue Bottle'])
    start_add(pg); keys(pg, '3'); next_step(pg); pg.fill('#w-q', 'aldi'); pg.press('#w-q', 'Enter'); pg.wait_for_timeout(50)
    check('add2: Enter selects the exact match', checked(pg, 'store') == 'aldi' and len(expenses(pg)) == 1)
    pg.press('#w-q', 'Enter'); pg.wait_for_timeout(150)
    check('add2: Enter again saves', len(expenses(pg)) == 2 and not sheet_open(pg))
    start_add(pg); keys(pg, '400'); pg.check('input[name=payer][value=p2]'); next_step(pg)
    check('add2: details summary, collapsed', pg.inner_text('#w-sum') == 'Today · split 50/50 · usual category'
          and pg.get_attribute('[data-act=toggle-opts]', 'aria-expanded') == 'false' and not pg.is_visible('#o-date'))
    open_details(pg)
    check('add2: details expanded', pg.get_attribute('[data-act=toggle-opts]', 'aria-expanded') == 'true' and pg.is_visible('#o-date')
          and pg.inner_text('#o-split-set legend') == 'Split' and pg.inner_text('#o-split-help') == 'Alex owes $200.00.')
    set_split(pg, 'full'); pg.fill('#o-date', '2026-09-01'); pg.fill('#o-note', 'Camera'); pg.select_option('#o-cat', 'Gifts & occasions')
    check('add2: summary and help follow the details', pg.inner_text('#w-sum') == 'Sep 1 · owed in full · Gifts & occasions'
          and pg.inner_text('#o-split-help') == 'Alex pays back the whole $400.00.')
    save_at_store(pg, 'target')
    cam = [x for x in expenses(pg) if x.get('note') == 'Camera']
    check('add2: details saved', cam and cam[0]['split'] == 'full' and cam[0]['payer'] == 'p2' and cam[0]['date'] == '2026-09-01'
          and cam[0]['category'] == 'Gifts & occasions')
    c.close()
    # ---- Bills ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); pg.click('[data-act=bill][data-id=electricity]'); next_step(pg); pg.wait_for_timeout(150)
    el = [x for x in expenses(pg) if x.get('billId') == 'electricity']
    check('bills: saved with its payer and month', el and el[0]['payer'] == 'p2' and el[0]['amountCents'] == 64555 and el[0]['merchant'] == 'Electricity'
          and el[0]['covers'] == month and el[0]['category'] == 'Utilities' and not sheet_open(pg))
    check('bills: toast', 'Logged ✅ $645.55 for Electricity' in toast_text(pg))
    start_add(pg); pg.click('[data-act=bill][data-id=water]')
    for _ in range(4): pg.click('[data-act=key][data-k=back]')
    keys(pg, '00'); next_step(pg); pg.wait_for_timeout(150)
    check('bills: says when it’s more than usual', 'That’s more than the usual $280.00.' in toast_text(pg))
    c.close()
    # ---- Review Focus 1 and 5, and the second member ----
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '5'); next_step(pg); pg.check('input[name=store][value=costco]'); pg.dblclick('#w-save'); pg.wait_for_timeout(250)
    check('add: a double tap saves once', len(expenses(pg)) == 1)
    pg.evaluate('window.__deny = true'); start_add(pg); keys(pg, '6'); next_step(pg); save_at_store(pg, 'target'); pg.wait_for_timeout(100)
    check('add: a refused save says so', 'security rules' in toast_text(pg))
    pg.evaluate('window.__deny = false')
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg, 'b_messy'); start_add(pg)
    check('add: the second member pays by default', checked(pg, 'payer') == 'p2')
    c.close()
    # ---- Short phones: the action bar stays on screen, the body scrolls above it ----
    for vp in ((375, 667), (320, 568)):
        c = new_ctx(b, 'light', vp); pg = open_app(c); login(pg); start_add(pg); pg.wait_for_timeout(300)
        dock, body = pg.locator('#layer .dock').bounding_box(), pg.locator('#layer .scroll').bounding_box()
        check(f'add1: {vp[0]}x{vp[1]} action bar on screen, body above it', dock['y'] + dock['height'] <= vp[1] + 1
              and body['y'] + body['height'] <= dock['y'] + 1 and pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        c.close()
