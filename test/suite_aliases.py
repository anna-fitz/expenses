from harness import *

FIXTURE = """{
  'trader-joes': {name: "Trader Joe's", category: 'Groceries'},
  'tjs': {name: 'TJs', category: 'Groceries', hidden: true, mergedInto: 'trader-joes'},
  'tj': {name: 'TJ', hidden: true, mergedInto: 'tjs'},
  'loop-a': {name: 'Loop A', hidden: true, mergedInto: 'loop-b'},
  'loop-b': {name: 'Loop B', hidden: true, mergedInto: 'loop-a'},
  'gone': {name: 'Gone', hidden: true},
  'costco': {name: 'Costco', category: 'Groceries'}}"""

def run(b):
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate(f"""import('./stores.js').then(m => {{ const M = {FIXTURE}; return [
      m.canonicalName(M, 'TJ'), m.canonicalName(M, 'TJs'), m.canonicalName(M, 'costco'), m.canonicalName(M, 'Unknown Place'),
      typeof m.canonicalName(M, 'Loop A'),
      m.pickerStores(M, '').map(s => s.name),
      m.pickerStores(M, 'tjs').map(s => [s.name, s.alsoCalled, s.exact]),
      m.pickerStores(M, 'joe').map(s => [s.id, s.alsoCalled, s.exact]),
      m.pickerStores(M, 'costco').map(s => [s.id, s.alsoCalled, s.exact]),
      m.removedStores(M).map(s => s.id),
      m.planRename(M, 'costco', 'COSTCO'), m.planRename(M, 'costco', "Trader Joe's"),
      m.planRename(M, 'costco', 'Costco Wholesale'), m.planRename(M, 'costco', '   ').kind]; }})""")
    check('aliases: chain resolves', r[0] == "Trader Joe's" and r[1] == "Trader Joe's")
    check('aliases: plain and unknown names', r[2] == 'Costco' and r[3] == 'Unknown Place')
    check('aliases: cycle terminates', r[4] == 'string')
    check('aliases: picker shows visible canonical stores A–Z', r[5] == ['Costco', "Trader Joe's"])
    check('aliases: picker finds a store by its old name, exact', r[6] == [["Trader Joe's", 'TJs', True]])
    check('aliases: substring of the current name', r[7] == [['trader-joes', None, False]])
    check('aliases: direct exact match', r[8] == [['costco', None, True]])
    check('aliases: removed list', r[9] == ['gone'])
    check('aliases: rename same slug', r[10] == {'kind': 'same', 'name': 'COSTCO'})
    check('aliases: rename onto a visible store is a conflict', r[11] == {'kind': 'conflict', 'targetId': 'trader-joes', 'targetName': "Trader Joe's"})
    check('aliases: rename to a new slug moves', r[12] == {'kind': 'move', 'newId': 'costco-wholesale', 'name': 'Costco Wholesale'})
    check('aliases: empty rename', r[13] == 'empty')
    c.close()
    # In the app
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    fs_write(pg, 'merchants/costco', {'hidden': True, 'mergedInto': 'trader-joes'})
    check('aliases: expense row shows the new name', "Trader Joe's" in pg.inner_text('#app .row .t'))
    start_add(pg); keys(pg, '5'); next_step(pg); pg.fill('#w-q', 'costco'); pg.wait_for_timeout(50)
    vals = pg.evaluate("[...document.querySelectorAll('input[name=store]')].map(i => i.value)")
    check('aliases: searching the old name finds the new store, no add tile', vals == ['trader-joes'] and 'also called Costco' in pg.inner_text('#w-list'))
    pg.keyboard.press('Escape')
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    before = len(activity(pg))
    pg.click(f'[data-act=edit][data-id="{eid}"]')
    check('aliases: edit shows the new name', pg.input_value('#e-store') == "Trader Joe's")
    pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    check('aliases: saving an aliased expense unchanged logs nothing', len(activity(pg)) == before and pg.inner_text('#toast span') == 'Nothing changed.')
    pg.click('[data-act=profile]')
    check('aliases: stats count under the new name', "Trader Joe's" in pg.inner_text('.stats'))
    pg.click('[data-act=close]')
    # Review Focus 3: re-adding a removed store's name un-hides it
    fs_write(pg, 'merchants/aldi', {'hidden': True})
    start_add(pg); keys(pg, '3'); next_step(pg); save_new_store(pg, 'Aldi', 'Groceries')
    check('aliases: re-adding a removed store un-hides it', st(pg)['merchants/aldi'].get('hidden') is False)
    c.close()
