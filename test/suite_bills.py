from harness import *

def rows(pg, sel): return pg.evaluate(f"[...document.querySelectorAll('{sel}')].map(e => e.dataset.id).join()")

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    open_bills(pg)
    check('bills: list screen', pg.inner_text('#layer-title') == 'Bills')
    check('bills: active in order', rows(pg, '#bl-active [data-act=bill-open]') == 'electricity,internet,gas-bill,water,pool-service,gardener')
    check('bills: row text', 'Electricity' in pg.inner_text('#bl-active') and '$645.55 · usually Kyle' in pg.inner_text('#bl-active'))
    # add: validation
    pg.click('[data-act=bill-new]'); pg.wait_for_timeout(50)
    check('bills: add form', pg.inner_text('#layer-title') == 'Add bill' and pg.inner_text('#bf-payer-set legend') == 'Usually paid by')
    pg.click('[data-act=bill-save]')
    check('bills: name required', pg.inner_text('#bf-err') == 'Enter a name' and pg.evaluate('document.activeElement.id') == 'bf-name')
    pg.fill('#bf-name', 'electricity'); pg.fill('#bf-amt', '40'); pg.click('[data-act=bill-save]')
    check('bills: name must be new', pg.inner_text('#bf-err') == 'There’s already a bill called Electricity')
    pg.fill('#bf-name', 'Trash'); pg.fill('#bf-amt', 'abc'); pg.click('[data-act=bill-save]')
    check('bills: amount checked', pg.inner_text('#bf-err') == 'Enter an amount, like 64.50' and pg.get_attribute('#bf-amt', 'aria-invalid') == 'true'
          and pg.get_attribute('#bf-name', 'aria-invalid') is None)
    # Review Focus 1: a live update doesn't wipe the half-typed form
    fs_write(pg, 'bills/water', {'usualCents': 28100})
    check('bills: live update keeps typed form', pg.input_value('#bf-name') == 'Trash' and pg.input_value('#bf-amt') == 'abc')
    pg.fill('#bf-amt', '40'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    t = st(pg).get('bills/trash', {})
    check('bills: added', t.get('usualCents') == 4000 and t.get('order') == 7 and t.get('active') is True and t.get('payer') == 'kyle'
          and t.get('category') == 'Utilities' and pg.inner_text('#layer-title') == 'Bills')
    a = [x for x in activity(pg) if x['action'] == 'bill'][-1]
    check('bills: add logged', a['kind'] == 'add' and a['summary'] == {'name': 'Trash', 'amountCents': 4000})
    # ID collision
    pg.click('[data-act=bill-new]'); pg.fill('#bf-name', 'Water!'); pg.fill('#bf-amt', '12'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    check('bills: id collision gets a suffix', st(pg).get('bills/water-2', {}).get('name') == 'Water!')
    # edit
    pg.click('[data-act=bill-open][data-id=electricity]')
    pg.fill('#bf-amt', '700'); pg.check('input[name=bf-payer][value=bre]'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    a = [x for x in activity(pg) if x['action'] == 'bill'][-1]
    check('bills: edit logs only changes', a['kind'] == 'edit' and a['summary'] == {'name': 'Electricity'}
          and a['changes'] == [{'field': 'usualCents', 'from': 64555, 'to': 70000}, {'field': 'payer', 'from': 'kyle', 'to': 'bre'}])
    n = len(activity(pg))
    pg.click('[data-act=bill-open][data-id=electricity]'); pg.click('[data-act=bill-save]'); pg.wait_for_timeout(100)
    check('bills: no-change save writes nothing', len(activity(pg)) == n and pg.inner_text('#toast span') == 'Nothing changed.')
    # retire / bring back
    pg.click('[data-act=bill-open][data-id=gardener]'); pg.click('[data-act=bill-retire]'); pg.wait_for_timeout(100)
    check('bills: retired', st(pg)['bills/gardener']['active'] is False and 'gardener' in rows(pg, '#bl-retired [data-act=bill-open]'))
    pg.keyboard.press('Escape'); start_add(pg)
    chips = pg.evaluate("[...document.querySelectorAll('[data-act=bill]')].map(e => e.dataset.id).join()")
    check('bills: step 1 follows the list', 'gardener' not in chips and 'trash' in chips)
    pg.keyboard.press('Escape'); open_bills(pg)
    pg.click('[data-act=bill-open][data-id=gardener]'); pg.click('[data-act=bill-restore]'); pg.wait_for_timeout(100)
    check('bills: brought back', st(pg)['bills/gardener']['active'] is True)
    c.close()
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => { const N = {bre: 'Bre', kyle: 'Kyle'}; return [
      m.activityLine({by: 'kyle', action: 'bill', kind: 'add', summary: {name: 'Trash', amountCents: 4000}}, N),
      m.activityLine({by: 'bre', action: 'bill', kind: 'edit', summary: {name: 'Electricity'}, changes: [
        {field: 'usualCents', from: 64555, to: 70000}, {field: 'payer', from: 'kyle', to: 'bre'}]}, N),
      m.activityLine({by: 'bre', action: 'bill', kind: 'retire', summary: {name: 'Gardener'}}, N),
      m.activityLine({by: 'bre', action: 'bill', kind: 'restore', summary: {name: 'Gardener'}}, N)]; })""")
    check('bills: activity sentences', r == ['Kyle added the bill Trash, usually $40.00',
        'Bre changed Electricity: usual amount $645.55 → $700.00, usually paid by Kyle → Bre',
        'Bre retired the bill Gardener', 'Bre brought back the bill Gardener'])
    c.close()
    # Final review I-2: a bill save doesn't bring back a removed store of the same name
    c = new_ctx(b); pg = open_app(c); login(pg)
    open_stores(pg); pg.click('[data-act=store-open][data-id=electricity]'); pg.click('#sd-remove'); pg.click('#sd-remove'); pg.wait_for_timeout(100)
    pg.keyboard.press('Escape')
    start_add(pg); pg.click('[data-act=bill][data-id=electricity]'); next_step(pg); pg.wait_for_timeout(200)
    check('bills: bill save keeps a removed store removed', st(pg)['merchants/electricity'].get('hidden') is True
          and len([e for e in expenses(pg) if e.get('billId') == 'electricity']) == 1)
    c.close()
