from web_harness import *

def ids(pg, sel): return pg.evaluate(f"[...document.querySelectorAll('{sel} [data-act=bill-open]')].map(e => e.dataset.id).join()")
def bill_log(pg): return [x for x in activity(pg) if x['action'] == 'bill']
def drawer_ready(pg, el): pg.wait_for_function(f"document.getElementById('{el}')?.contains(document.activeElement)"); pg.wait_for_timeout(250)
def sheet_ready(pg): pg.wait_for_selector('#bf-name'); pg.wait_for_timeout(250)

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'settings'); pg.click('[data-act=bills]'); pg.wait_for_timeout(200)
    check('bills: the page, active in order', pg.inner_text('#screen-title') == 'Bills' and 'Coming soon' not in pg.inner_text('main')
          and ids(pg, '#bl-active') == 'electricity,internet,gas-bill,water,pool-service,gardener' and pg.locator('#bl-retired').count() == 0
          and '$645.55 · usually Sam' in pg.inner_text('[data-act=bill-open][data-id=electricity]'))
    # ---- Add ----
    pg.click('[data-act=bill-new]'); sheet_ready(pg)
    check('bills: the add sheet and its defaults', pg.inner_text('#layer-title') == 'Add bill' and pg.evaluate('location.hash') == '#/settings/bills/new'
          and pg.input_value('#bf-cat') == 'Utilities' and checked(pg, 'bf-payer') == 'p2' and pg.inner_text('#bf-payer-set legend') == 'Usually paid by'
          and pg.inner_text('#layer header [data-act=close]') == 'Cancel' and pg.locator('[data-act=bill-retire], [data-act=bill-restore]').count() == 0)
    for name, amt, msg, field in (('', '40', 'Enter a name', 'bf-name'), ('water', '40', 'There’s already a bill called Water', 'bf-name'),
                                  ('Costco', '40', 'There’s already a store called Costco. Give the bill a different name.', 'bf-name'),
                                  ('Trash', 'abc', 'Enter an amount, like 64.50', 'bf-amt'), ('Trash', '100001', 'Enter an amount, like 64.50', 'bf-amt')):
        pg.fill('#bf-name', name); pg.fill('#bf-amt', amt); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(80)
        check(f'bills: “{msg}”', pg.inner_text('#bf-err') == msg and pg.get_attribute(f'#{field}', 'aria-invalid') == 'true'
              and 'bf-err' in pg.get_attribute(f'#{field}', 'aria-describedby') and pg.evaluate('document.activeElement.id') == field)
    pg.fill('#bf-name', 'Trash'); pg.fill('#bf-amt', '40'); pg.dblclick('[data-act=bill-save]'); pg.wait_for_timeout(250)
    t = st(pg).get('bills/trash', {})
    check('bills: added at the end, active, logged once (a double tap saves once)', t.get('usualCents') == 4000 and t.get('order') == 7
          and t.get('active') is True and t.get('payer') == 'p2' and t.get('category') == 'Utilities'
          and [x['kind'] for x in bill_log(pg)] == ['add'] and bill_log(pg)[0]['summary'] == {'name': 'Trash', 'amountCents': 4000}
          and not sheet_open(pg) and 'Bill saved.' in toast_text(pg) and ids(pg, '#bl-active').endswith(',trash'))
    pg.click('[data-act=bill-new]'); sheet_ready(pg); pg.fill('#bf-name', 'Water!'); pg.fill('#bf-amt', '12'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(200)
    check('bills: a new id gets a number when taken', st(pg).get('bills/water-2', {}).get('name') == 'Water!')
    # ---- Edit ----
    pg.click('[data-act=bill-open][data-id=electricity]'); sheet_ready(pg)
    check('bills: editing shows the bill', pg.inner_text('#layer-title') == 'Electricity' and pg.input_value('#bf-amt') == '645.55'
          and pg.evaluate('location.hash') == '#/settings/bills/electricity')
    n = len(bill_log(pg)); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(200)
    check('bills: saving without changes writes nothing (its own store record is no clash)', len(bill_log(pg)) == n and 'Nothing changed.' in toast_text(pg))
    pg.click('[data-act=bill-open][data-id=electricity]'); sheet_ready(pg)
    pg.fill('#bf-amt', '700'); pg.check('input[name=bf-payer][value=p1]'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(200)
    e = bill_log(pg)[-1]
    check('bills: an edit logs only what changed', e['kind'] == 'edit' and e['summary'] == {'name': 'Electricity'}
          and e['changes'] == [{'field': 'usualCents', 'from': 64555, 'to': 70000}, {'field': 'payer', 'from': 'p2', 'to': 'p1'}]
          and '$700.00 · usually You' in pg.inner_text('[data-act=bill-open][data-id=electricity]'))
    pg.click('[data-act=bill-open][data-id=electricity]'); sheet_ready(pg); close_sheet(pg)
    check('bills: Escape closes the sheet', not sheet_open(pg) and pg.evaluate('location.hash') == '#/settings/bills')
    # ---- Retire and bring back ----
    pg.click('[data-act=bill-open][data-id=gardener]'); sheet_ready(pg); pg.click('[data-act=bill-retire]'); drawer_ready(pg, 'retire')
    check('bills: retiring asks first', pg.inner_text('#retire-title') == 'Retire Gardener?'
          and pg.inner_text('#retire-help') == 'It leaves Pick a bill. Past expenses stay as they are.')
    pg.click('[data-act=bill-retire-yes]'); pg.wait_for_timeout(250)
    check('bills: retired, logged, listed under Retired', st(pg)['bills/gardener']['active'] is False and bill_log(pg)[-1]['kind'] == 'retire'
          and 'gardener' in ids(pg, '#bl-retired') and 'gardener' not in ids(pg, '#bl-active') and 'Bill retired.' in toast_text(pg) and not sheet_open(pg))
    tab(pg, 'home'); start_add(pg); pg.click('[data-act=pick-bill]'); pg.wait_for_selector('#bills'); pg.wait_for_timeout(150)
    chips = pg.evaluate("[...document.querySelectorAll('#bills [data-act=bill]')].map(e => e.dataset.id).join()")
    check('bills: Pick a bill follows the list', 'gardener' not in chips and 'trash' in chips)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250); close_sheet(pg)
    tab(pg, 'settings'); pg.click('[data-act=bills]'); pg.wait_for_timeout(150)
    pg.click('[data-act=bill-open][data-id=gardener]'); sheet_ready(pg)
    check('bills: a retired bill offers Bring back', pg.locator('[data-act=bill-retire]').count() == 0 and pg.inner_text('[data-act=bill-restore]') == 'Bring back')
    pg.click('[data-act=bill-restore]'); pg.wait_for_timeout(250)
    check('bills: brought back', st(pg)['bills/gardener']['active'] is True and bill_log(pg)[-1]['kind'] == 'restore' and 'Bill is back.' in toast_text(pg)
          and not sheet_open(pg))
    pg.evaluate("location.hash = '#/settings/bills/nope'"); pg.wait_for_timeout(250)
    check('bills: a stale link lands on the list', not sheet_open(pg) and pg.evaluate('location.hash') == '#/settings/bills')
    c.close()
