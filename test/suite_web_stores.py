from web_harness import *

BILL_NAMES = {'Electricity', 'Internet', 'Gas bill', 'Water', 'Pool service', 'Gardener'}
def names(pg): return pg.evaluate("[...document.querySelectorAll('[data-act=store-open] .t')].map(e => e.textContent)")
def open_store(pg, sid): pg.click(f'[data-act=store-open][data-id="{sid}"]'); pg.wait_for_selector('#sd-name'); pg.wait_for_timeout(150)
def store_log(pg): return [x for x in activity(pg) if x['action'] == 'store']
def drawer_ready(pg, el): pg.wait_for_function(f"document.getElementById('{el}')?.contains(document.activeElement)"); pg.wait_for_timeout(250)

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'settings'); pg.click('[data-act=stores]'); pg.wait_for_timeout(200)
    n = names(pg)
    check('stores: the list, A–Z, without bills', pg.inner_text('#screen-title') == 'Stores' and 'Coming soon' not in pg.inner_text('main')
          and len(n) == 17 and n == sorted(n, key=str.lower) and not set(n) & BILL_NAMES and pg.inner_text('label[for=st-q]') == 'Search stores')
    fs_write(pg, 'merchants/tjs', {'name': 'TJs', 'hidden': True, 'mergedInto': 'trader-joes'})
    pg.fill('#st-q', 'tjs'); pg.wait_for_timeout(80)
    check('stores: search finds a store by an old name', names(pg) == ["Trader Joe’s"] or names(pg) == ["Trader Joe's"])
    check('stores: …and shows the old name', 'also called TJs' in pg.inner_text('[data-act=store-open]'))
    pg.fill('#st-q', 'zzzz'); pg.wait_for_timeout(80)
    check('stores: nothing matches', 'No stores match.' in pg.inner_text('main'))
    pg.fill('#st-q', '')
    # ---- A store's page ----
    open_store(pg, 'aldi')
    check('store: its page', pg.inner_text('#screen-title') == 'Aldi' and pg.evaluate('location.hash') == '#/settings/stores/aldi'
          and pg.evaluate('document.activeElement.id') == 'screen-title' and pg.input_value('#sd-name') == 'Aldi'
          and pg.input_value('#sd-cat') == 'Groceries' and pg.inner_text('[data-act=back-stores]').endswith('Stores'))
    pg.fill('#sd-name', '  '); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(80)
    check('store: a name is needed', pg.inner_text('#sd-err') == 'Enter a name' and pg.get_attribute('#sd-name', 'aria-invalid') == 'true'
          and 'sd-err' in pg.get_attribute('#sd-name', 'aria-describedby') and pg.evaluate('document.activeElement.id') == 'sd-name')
    pg.fill('#sd-name', 'water'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(80)
    check('store: a bill’s name is refused, before any merge is offered', pg.inner_text('#sd-err') == 'water is a bill. Give the store a different name.'
          and pg.locator('#sd-conflict').count() == 0 and st(pg)['merchants/aldi'].get('hidden') is not True)
    pg.fill('#sd-name', 'ALDI'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(150)
    check('store: changing only the capitals keeps the record', st(pg)['merchants/aldi']['name'] == 'ALDI' and 'Store renamed.' in toast_text(pg)
          and store_log(pg)[-1]['kind'] == 'rename' and store_log(pg)[-1]['summary'] == {'name': 'Aldi', 'to': 'ALDI'})
    fs_batch(pg, [exp_row('e1', 500, 'p1')]); fs_write(pg, 'expenses/e1', {'merchant': 'ALDI'})
    pg.fill('#sd-name', 'Aldi Market'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(200)
    s = st(pg)
    check('store: a new name keeps the old one as an alias, and you stay on the store', s['merchants/aldi-market']['name'] == 'Aldi Market'
          and s['merchants/aldi'].get('mergedInto') == 'aldi-market' and s['merchants/aldi'].get('hidden') is True
          and s['merchants/aldi-market']['category'] == 'Groceries' and s['merchants/aldi-market']['count'] == 3
          and pg.evaluate('location.hash') == '#/settings/stores/aldi-market' and pg.inner_text('#screen-title') == 'Aldi Market')
    tab(pg, 'home')
    check('store: past expenses show the new name', 'Aldi Market' in pg.inner_text('[data-id=e1]'))
    tab(pg, 'settings'); pg.click('[data-act=stores]'); pg.wait_for_timeout(150); open_store(pg, 'aldi-market')
    pg.select_option('#sd-cat', 'Home & household'); pg.wait_for_timeout(150)
    check('store: the usual category saves and is logged', st(pg)['merchants/aldi-market']['category'] == 'Home & household' and 'Category saved.' in toast_text(pg)
          and store_log(pg)[-1]['kind'] == 'category' and store_log(pg)[-1]['changes'] == [{'field': 'category', 'from': 'Groceries', 'to': 'Home & household'}])
    check('store: categories A–Z, Other last', pg.evaluate("[...document.querySelectorAll('#sd-cat option')].map(o => o.value)")[-1] == 'Other')
    pg.fill('#sd-name', 'costco'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(120)
    check('store: another store’s name offers a merge', pg.inner_text('#sd-conflict').startswith('There’s already a store called Costco.')
          and pg.inner_text('[data-act=store-merge-into]') == 'Merge into Costco' and pg.evaluate('document.activeElement.dataset.act') == 'store-merge-into')
    before = st(pg)['merchants/costco']['count']
    pg.click('[data-act=store-merge-into]'); pg.wait_for_timeout(200)
    s = st(pg)
    check('store: merging from the offer', s['merchants/aldi-market'].get('mergedInto') == 'costco' and s['merchants/costco']['count'] == before + 3
          and store_log(pg)[-1]['kind'] == 'merge' and store_log(pg)[-1]['summary'] == {'name': 'Aldi Market', 'to': 'Costco'}
          and pg.evaluate('location.hash') == '#/settings/stores' and 'Stores merged.' in toast_text(pg))
    # ---- Merge drawer ----
    open_store(pg, 'sprouts')
    pg.click('[data-act=store-merge-open]'); drawer_ready(pg, 'merge')
    check('merge: a drawer with search and the other stores', pg.inner_text('#merge-title') == 'Merge Sprouts into…'
          and pg.inner_text('#merge-help') == 'Past expenses at Sprouts will show and count under the store you pick.'
          and pg.locator('input[name=merge-target][value=sprouts]').count() == 0 and pg.locator('input[name=merge-target][value=water]').count() == 0
          and pg.inner_text('[data-act=store-merge]') == 'Pick a store to merge into')
    pg.click('[data-act=store-merge]'); pg.wait_for_timeout(80)
    check('merge: needs a store', pg.inner_text('#sm-err') == 'Pick a store to merge into' and pg.evaluate('document.activeElement.name') == 'merge-target')
    pg.fill('#sm-q', 'ral'); pg.wait_for_timeout(80); pg.check('input[name=merge-target][value=ralphs]')
    check('merge: the button names the store', pg.inner_text('[data-act=store-merge]') == 'Merge into Ralphs')
    pg.click('[data-act=merge-cancel]'); pg.wait_for_timeout(250)
    check('merge: Not yet keeps everything', pg.locator('#merge').count() == 0 and st(pg)['merchants/sprouts'].get('mergedInto') is None
          and pg.evaluate('document.activeElement.dataset.act') == 'store-merge-open')
    pg.click('[data-act=store-merge-open]'); drawer_ready(pg, 'merge'); pg.fill('#sm-q', 'ral'); pg.check('input[name=merge-target][value=ralphs]')
    pg.click('[data-act=store-merge]'); pg.wait_for_timeout(200)
    check('merge: merged, logged, back on the list', st(pg)['merchants/sprouts'].get('mergedInto') == 'ralphs' and store_log(pg)[-1]['kind'] == 'merge'
          and pg.evaluate('location.hash') == '#/settings/stores' and 'Sprouts' not in names(pg))
    # ---- Remove and bring back ----
    open_store(pg, 'chipotle')
    pg.click('[data-act=store-remove]'); drawer_ready(pg, 'remove')
    check('remove: a confirm drawer', pg.inner_text('#remove-title') == 'Remove Chipotle?' and pg.inner_text('[data-act=store-remove-yes]') == 'Remove store'
          and 'bring it back from the Stores list' in pg.inner_text('#remove-help'))
    pg.click('[data-act=store-remove-yes]'); pg.wait_for_timeout(200)
    check('remove: hidden, logged, listed under Removed', st(pg)['merchants/chipotle'].get('hidden') is True and store_log(pg)[-1]['kind'] == 'remove'
          and pg.evaluate('location.hash') == '#/settings/stores' and 'Chipotle' in pg.inner_text('#st-removed') and 'Chipotle' not in names(pg)
          and pg.get_attribute('[data-act=store-restore][data-id=chipotle]', 'aria-label') == 'Bring back Chipotle')
    tab(pg, 'home'); start_add(pg); keys(pg, '5'); next_step(pg)
    check('remove: gone from the store picker in Add', pg.locator('input[name=store][value=chipotle]').count() == 0)
    close_sheet(pg); tab(pg, 'settings'); pg.click('[data-act=stores]'); pg.wait_for_timeout(150)
    pg.click('[data-act=store-restore][data-id=chipotle]'); pg.wait_for_timeout(150)
    check('remove: Bring back', st(pg)['merchants/chipotle'].get('hidden') is False and store_log(pg)[-1]['kind'] == 'restore'
          and 'Store is back.' in toast_text(pg) and 'Chipotle' in names(pg))
    # ---- Gone on the other phone; a stale link ----
    open_store(pg, 'petsmart')
    fs_write(pg, 'merchants/petsmart', {'hidden': True}); pg.wait_for_timeout(250)
    check('store: gone on the other phone lands you on the list', pg.evaluate('location.hash') == '#/settings/stores' and pg.inner_text('#screen-title') == 'Stores')
    pg.evaluate("location.hash = '#/settings/stores/nope'"); pg.wait_for_timeout(250)
    check('store: a stale link lands on the list', pg.evaluate('location.hash') == '#/settings/stores')
    c.close()
