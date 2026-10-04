from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    pg.click('[data-act=profile]')
    check('stores: Shared lists in Profile', pg.locator('#layer [data-act=open-stores]').count() == 1)
    pg.click('[data-act=open-stores]'); pg.wait_for_timeout(50)
    check('stores: list screen', pg.inner_text('#layer-title') == 'Stores' and pg.inner_text('label[for=st-q]') == 'Search stores')
    names = pg.evaluate("[...document.querySelectorAll('#st-list [data-act=store-open] .t')].map(e => e.textContent)")
    check('stores: A–Z', len(names) == 23 and names == sorted(names, key=str.lower))
    pg.fill('#st-q', 'ral'); pg.wait_for_timeout(50)
    check('stores: search filters', pg.evaluate("[...document.querySelectorAll('#st-list [data-act=store-open]')].map(e => e.dataset.id).join()") == 'ralphs')
    pg.click('[data-act=store-open][data-id=ralphs]'); pg.wait_for_timeout(50)
    check('stores: detail screen', pg.inner_text('#layer-title') == 'Ralphs')
    # rename, same slug
    pg.fill('#sd-name', 'RALPHS'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(100)
    a = [x for x in activity(pg) if x['action'] == 'store']
    check('stores: rename same slug', st(pg)['merchants/ralphs']['name'] == 'RALPHS' and a[-1]['kind'] == 'rename'
          and a[-1]['summary'] == {'name': 'Ralphs', 'to': 'RALPHS'})
    # rename, new slug
    pg.fill('#sd-name', 'Ralphs Fresh Fare'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(100)
    s = st(pg)
    check('stores: rename to a new slug', s['merchants/ralphs-fresh-fare'].get('hidden') is False and s['merchants/ralphs-fresh-fare']['count'] == 38
          and s['merchants/ralphs'] .get('mergedInto') == 'ralphs-fresh-fare' and pg.inner_text('#layer-title') == 'Ralphs Fresh Fare')
    # Review Focus 1: a live update doesn't wipe a half-typed name
    pg.fill('#sd-name', 'Ralphs Fresh'); fs_write(pg, 'merchants/zzz', {'name': 'Zzz', 'category': 'Other', 'count': 1})
    check('stores: live update keeps typed name', pg.input_value('#sd-name') == 'Ralphs Fresh')
    # rename onto an existing store offers a merge
    pg.fill('#sd-name', 'Costco'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(50)
    check('stores: conflict offers a merge', pg.is_visible('#sd-conflict') and 'There’s already a store called Costco.' in pg.inner_text('#sd-conflict'))
    pg.click('#sd-conflict [data-act=store-merge-into]'); pg.wait_for_timeout(100)
    s = st(pg)
    check('stores: merged via conflict', s['merchants/ralphs-fresh-fare']['mergedInto'] == 'costco' and s['merchants/costco']['count'] == 58
          and pg.inner_text('#layer-title') == 'Stores')
    # Review Focus 5: chained merges resolve in expense rows
    pg.keyboard.press('Escape')
    fs_write(pg, 'expenses/fx1', {'amountCents': 900, 'payer': 'bre', 'merchant': 'Ralphs', 'category': 'Groceries', 'date': '2026-10-01',
                                  'split': 'half', 'settled': False, 'createdBy': 'bre', 'createdAt': 1})
    check('stores: chained merges resolve', 'Costco' in pg.inner_text(f'#app [data-id=fx1] .t'))
    # category
    pg.click('[data-act=profile]'); pg.click('[data-act=open-stores]'); pg.click('[data-act=store-open][data-id=target]')
    pg.select_option('#sd-cat', 'Gifts & occasions'); pg.wait_for_timeout(100)
    a = [x for x in activity(pg) if x['action'] == 'store'][-1]
    check('stores: category saved + logged', st(pg)['merchants/target']['category'] == 'Gifts & occasions' and a['kind'] == 'category'
          and a['changes'] == [{'field': 'category', 'from': 'Home & household', 'to': 'Gifts & occasions'}])
    # empty name
    pg.fill('#sd-name', ''); pg.click('[data-act=store-rename]')
    check('stores: empty name error', pg.inner_text('#sd-err') == 'Enter a name' and pg.get_attribute('#sd-name', 'aria-invalid') == 'true'
          and pg.evaluate('document.activeElement.id') == 'sd-name')
    # merge via picker, with and without a choice
    pg.click('[data-act=store-back]'); pg.click('[data-act=store-open][data-id=aldi]')
    pg.click('#sm-go')
    check('stores: merge needs a choice', pg.inner_text('#sm-err') == 'Pick a store to merge into')
    pg.fill('#sm-q', 'sprou'); pg.wait_for_timeout(50); pg.check('input[name=merge-target][value=sprouts]')
    check('stores: merge button names the target', pg.inner_text('#sm-go') == 'Merge into Sprouts')
    pg.click('#sm-go'); pg.wait_for_timeout(100)
    check('stores: merged via picker', st(pg)['merchants/aldi']['mergedInto'] == 'sprouts')
    # remove and bring back
    pg.click('[data-act=store-open][data-id=fuel]'); pg.click('#sd-remove')
    check('stores: remove asks twice', pg.inner_text('#sd-remove') == 'Tap again to remove' and not st(pg)['merchants/fuel'].get('hidden'))
    pg.click('#sd-remove'); pg.wait_for_timeout(100)
    check('stores: removed', st(pg)['merchants/fuel'].get('hidden') is True and 'mergedInto' not in st(pg)['merchants/fuel']
          and 'Fuel' in pg.inner_text('#layer') and pg.locator('[data-act=store-restore][data-id=fuel]').count() == 1)
    pg.click('[data-act=store-restore][data-id=fuel]'); pg.wait_for_timeout(100)
    check('stores: brought back', st(pg)['merchants/fuel'].get('hidden') is False)
    c.close()
    # activity sentences
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => { const N = {bre: 'Bre', kyle: 'Kyle'}; return [
      m.activityLine({by: 'bre', action: 'store', kind: 'rename', summary: {name: "Ralph's", to: 'Ralphs'}}, N),
      m.activityLine({by: 'kyle', action: 'store', kind: 'merge', summary: {name: 'Trader Joes', to: "Trader Joe's"}}, N),
      m.activityLine({by: 'bre', action: 'store', kind: 'category', summary: {name: 'Costco'}, changes: [{field: 'category', from: 'Groceries', to: 'Home & household'}]}, N),
      m.activityLine({by: 'bre', action: 'store', kind: 'remove', summary: {name: 'Love and affection'}}, N),
      m.activityLine({by: 'bre', action: 'store', kind: 'restore', summary: {name: 'Love and affection'}}, N)]; })""")
    check('stores: activity sentences', r == ["Bre renamed Ralph's to Ralphs", "Kyle merged Trader Joes into Trader Joe's",
        'Bre changed Costco’s usual category: Groceries → Home & household', 'Bre removed the store Love and affection',
        'Bre brought back the store Love and affection'])
    c.close()
    # Final review I-1: renaming onto an alias of another store offers that store, never un-merges
    c = new_ctx(b); pg = open_app(c); login(pg)
    fs_write(pg, 'merchants/tj', {'name': 'TJ', 'hidden': True, 'mergedInto': 'trader-joes'})
    open_stores(pg); pg.click('[data-act=store-open][data-id=ralphs]')
    pg.fill('#sd-name', 'TJ'); pg.click('[data-act=store-rename]'); pg.wait_for_timeout(100)
    check('stores: rename onto an alias offers its store', pg.is_visible('#sd-conflict') and 'Trader Joe’s' in pg.inner_text('#sd-conflict') or "Trader Joe's" in pg.inner_text('#sd-conflict'))
    check('stores: alias left alone', st(pg)['merchants/tj'].get('mergedInto') == 'trader-joes' and st(pg)['merchants/tj'].get('hidden') is True)
    # Final review I-4: re-adding a former alias of a removed store makes it visible
    pg.keyboard.press('Escape')
    fs_write(pg, 'merchants/love-affection', {'name': 'Love & Affection', 'category': 'Other', 'hidden': True})
    fs_write(pg, 'merchants/love-and-affection', {'name': 'Love and affection', 'category': 'Other', 'hidden': True, 'mergedInto': 'love-affection'})
    start_add(pg); keys(pg, '2'); next_step(pg); save_new_store(pg, 'Love and affection', 'Other')
    m = st(pg)['merchants/love-and-affection']
    check('stores: re-added alias of a removed store is visible', m.get('hidden') is False and m.get('mergedInto') is None)
    c.close()
