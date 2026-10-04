from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg)
    check('add1: big title', pg.evaluate("parseFloat(getComputedStyle(document.getElementById('layer-title')).fontSize)") >= 26)
    check('add1: step marker', pg.inner_text('#layer .step') == 'Step 1 of 2')
    check('add1: visible Amount label', pg.is_visible('#amt-label') and pg.inner_text('#amt-label') == 'Amount')
    check('add1: amount group labelled', pg.evaluate("document.querySelector('[aria-labelledby=amt-label]') !== null"))
    check('add1: hint', pg.inner_text('#amt-hint') == 'Type it in, or pick a bill.')
    check('add1: paid-by legend', pg.inner_text('#payer-set legend') == 'Paid by')
    check('add1: You first and checked', pg.evaluate("[...document.querySelectorAll('input[name=payer]')].map(i => i.value + (i.checked ? '*' : '')).join()") == 'bre*,kyle')
    check('add1: Bills heading', pg.inner_text('#bills-h') == 'Bills')
    check('add1: Next label', pg.inner_text('[data-act=next]') == 'Next: choose store')
    pg.check('input[name=payer][value=kyle]'); keys(pg, '12')
    check('add1: payer kept after typing', pg.evaluate("document.querySelector('input[name=payer]:checked').value") == 'kyle')
    pg.click('[data-act=bill][data-id=internet]'); pg.wait_for_timeout(50)
    check('add1: bill label', pg.inner_text('[data-act=next]') == 'Save Internet, $80.00')
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5')   # 80.00 → 80.0 → 80. → 80.5
    check('add1: bill label follows edits', pg.inner_text('[data-act=next]') == 'Save Internet, $80.50')
    pg.wait_for_timeout(700)
    check('add1: amount announced', pg.inner_text('#announcer').startswith('Amount $'))
    pg.keyboard.press('Escape')
    c.close()
    # Review Focus 1: small screen overlap
    c = new_ctx(b, 'light', (375, 667)); pg = open_app(c); login(pg); start_add(pg); pg.wait_for_timeout(400)  # let the open animation settle
    keys_box = pg.locator('#layer .keys').bounding_box(); dock_box = pg.locator('#layer .dock').bounding_box()
    check('add1: small screen keypad clear of bottom bar', keys_box['y'] + keys_box['height'] <= dock_box['y'] + 1)
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg)
    check('add2: question title', pg.inner_text('#layer-title') == 'Where was it?' and pg.inner_text('#layer .step') == 'Step 2 of 2')
    check('add2: context line', '$45.12, paid by you' in pg.inner_text('#layer .ctx'))
    check('add2: visible Store label', pg.is_visible('label[for=w-q]') and pg.inner_text('label[for=w-q]') == 'Store')
    names = pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.closest('label').querySelector('span').firstChild.textContent)")
    check('add2: all stores A–Z', len(names) == 23 and names == sorted(names, key=str.lower))
    check('add2: Save waits for a store', pg.inner_text('#w-save') == 'Choose a store')
    pg.click('#w-save')
    check('add2: pick-a-store error', pg.is_visible('#w-err') and pg.inner_text('#w-err') == 'Pick a store first' and len(expenses(pg)) == 0)
    pg.check('input[name=store][value=costco]')
    check('add2: selecting does not save', len(expenses(pg)) == 0 and not pg.is_visible('#w-err'))
    check('add2: Save names the store', pg.inner_text('#w-save') == 'Save $45.12 at Costco')
    # Review Focus 2: filtering out the selection clears it
    pg.fill('#w-q', 'tar'); pg.wait_for_timeout(50)
    check('add2: filter A–Z', pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.value).join()") == '__new__,target')
    check('add2: hidden selection cleared', pg.inner_text('#w-save') == 'Choose a store')
    pg.fill('#w-q', ''); pg.wait_for_timeout(50)
    # Review Focus 3: live store update keeps focus and selection
    pg.check('input[name=store][value=ralphs]'); pg.focus('input[name=store][value=ralphs]')
    fs_write(pg, 'merchants/zzz-cafe', {'name': 'Zzz Cafe', 'category': 'Coffee', 'count': 1})
    check('add2: live update keeps selection', pg.evaluate("document.querySelector('input[name=store]:checked').value") == 'ralphs')
    check('add2: live update keeps focus', pg.evaluate("document.activeElement.value") == 'ralphs')
    check('add2: new store appears', pg.locator('input[name=store][value=zzz-cafe]').count() == 1)
    # Edit amount keeps state
    pg.click('#layer .ctx [data-act=back-amount]'); pg.wait_for_timeout(50)
    check('add2: Edit amount keeps amount', pg.inner_text('#amt') == '$45.12')
    next_step(pg)
    check('add2: back keeps selection', pg.evaluate("document.querySelector('input[name=store]:checked')?.value") == 'ralphs')
    pg.click('#w-save'); pg.wait_for_timeout(100)
    check('add2: saved Ralphs', [e['merchant'] for e in expenses(pg)] == ['Ralphs'])
    # New store needs a category
    start_add(pg); keys(pg, '9'); next_step(pg); pg.fill('#w-q', 'Blue Bottle'); pg.wait_for_timeout(50)
    check('add2: new-store tile first', pg.evaluate("document.querySelector('input[name=store]').value") == '__new__'
          and 'Add Blue Bottle as a new store' in pg.inner_text('#w-list'))
    pg.check('input[name=store][value=__new__]'); pg.wait_for_timeout(50)
    check('add2: category select labelled', pg.inner_text('label[for=w-cat]') == 'Category for Blue Bottle')
    pg.click('#w-save')
    check('add2: category required', pg.inner_text('#w-err') == 'Pick a category for Blue Bottle'
          and pg.evaluate('document.activeElement.id') == 'w-cat' and len(expenses(pg)) == 1)
    pg.select_option('#w-cat', 'Coffee'); pg.click('#w-save'); pg.wait_for_timeout(100)
    check('add2: new store saved + learned', st(pg).get('merchants/blue-bottle', {}).get('category') == 'Coffee')
    # Enter selects, Enter again saves
    start_add(pg); keys(pg, '3'); next_step(pg); pg.fill('#w-q', 'aldi'); pg.press('#w-q', 'Enter'); pg.wait_for_timeout(50)
    check('add2: Enter selects exact match', pg.evaluate("document.querySelector('input[name=store]:checked')?.value") == 'aldi' and len(expenses(pg)) == 2)
    pg.press('#w-q', 'Enter'); pg.wait_for_timeout(100)
    check('add2: Enter again saves', len(expenses(pg)) == 3)
    # Details row
    start_add(pg); keys(pg, '3'); next_step(pg)
    check('add2: details summary', pg.inner_text('#w-sum') == 'Today · split 50/50 · usual category')
    check('add2: details collapsed', pg.get_attribute('[data-act=toggle-opts]', 'aria-expanded') == 'false')
    open_details(pg)
    check('add2: details expanded', pg.get_attribute('[data-act=toggle-opts]', 'aria-expanded') == 'true' and pg.is_visible('#o-date'))
    check('add2: split is a labelled group', pg.inner_text('#o-split-set legend') == 'Split')
    c.close()
    # Final review #1: no overlap on short phones, default and error states
    def layout_ok(pg):
        g = lambda sel: pg.locator(sel).bounding_box()
        top, label, payer, bills, keys_, dock = g('#layer .top'), g('#amt-label'), g('#payer-set'), g('#bills-h'), g('#layer .keys'), g('#layer .dock')
        visible_area = g('#layer .amount-step')
        # Either everything fits without overlap, or the step scrolls (content is reachable, nothing drawn over anything)
        no_overlap = label['y'] >= top['y'] + top['height'] - 1 and payer['y'] + payer['height'] <= bills['y'] + 1 and keys_['y'] + keys_['height'] <= dock['y'] + 1
        scrolls = pg.evaluate("(() => { const a = document.querySelector('#layer .amount-step'); return a.scrollHeight > a.clientHeight + 1; })()")
        overlap_free = pg.evaluate("""(() => {
          const r = s => document.querySelector(s).getBoundingClientRect();
          const a = r('#amt-label'), p = r('#payer-set'), b = r('#bills-h');
          return p.bottom <= b.top + 1 && a.top >= r('#layer .display').top - 1; })()""")
        return no_overlap or (scrolls and overlap_free)
    for vp in ((375, 647), (320, 568)):
        c = new_ctx(b, 'light', vp); pg = open_app(c); login(pg); start_add(pg); pg.wait_for_timeout(400)
        check(f'add1: {vp[0]}x{vp[1]} no overlap', layout_ok(pg))
        next_step(pg); pg.wait_for_timeout(50)
        check(f'add1: {vp[0]}x{vp[1]} no overlap with error', layout_ok(pg))
        c.close()
    # Final review #2: Enter on a control does that control's job, not Next
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); pg.focus('#layer [data-act=close]'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    check('add1: Enter on Cancel cancels', pg.evaluate("document.getElementById('layer').hidden") is True)
    start_add(pg); pg.click('[data-act=bill][data-id=water]'); pg.wait_for_timeout(50)
    pg.focus('[data-act=clear-bill]'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    check('add1: Enter on Change clears the bill, saves nothing', len(expenses(pg)) == 0 and pg.locator('#bills-h').count() == 1)
    pg.focus('#layer-title'); pg.keyboard.type('7'); pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    check('add1: Enter elsewhere still means Next', pg.inner_text('#layer-title') == 'Where was it?')
    c.close()
