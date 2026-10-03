from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    a = activity(pg)
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    check('activity: add entry with fixed id', len(a) == 1 and a[0]['id'] == f'add-{eid}' and a[0]['action'] == 'add'
          and a[0]['by'] == 'bre' and a[0]['summary'] == {'amountCents': 4512, 'merchant': 'Costco', 'payer': 'bre'})
    # Undo erases both the expense and its add entry
    start_add(pg); keys(pg, '10'); next_step(pg); save_at_store(pg, 'target')
    check('activity: second add logged', len(activity(pg)) == 2)
    pg.click('#toast [data-toast="0"]'); pg.wait_for_timeout(100)
    a = activity(pg)
    check('activity: undo leaves no trace', len(a) == 1 and a[0]['summary']['merchant'] == 'Costco'
          and not any(x['action'] == 'undo' for x in a))
    # Edit logs only changed fields, summary from before the edit
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.fill('#e-amt', '25'); pg.fill('#e-store', 'Target'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    ed = [x for x in activity(pg) if x['action'] == 'edit']
    check('activity: edit entry', len(ed) == 1 and ed[0]['expenseId'] == eid and ed[0]['summary']['merchant'] == 'Costco'
          and ed[0]['changes'] == [{'field': 'amountCents', 'from': 4512, 'to': 2500}, {'field': 'merchant', 'from': 'Costco', 'to': 'Target'}])
    # Edit with no changes writes nothing (Review Focus 4)
    before = len(activity(pg)); upd = st(pg)[f'expenses/{eid}']['updatedAt']
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    check('activity: no-change edit logs nothing', len(activity(pg)) == before and st(pg)[f'expenses/{eid}']['updatedAt'] == upd)
    check('activity: no-change edit says so', pg.inner_text('#toast span') == 'Nothing changed.')
    # Delete
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.click('[data-act=e-delete]'); pg.click('[data-act=e-delete]'); pg.wait_for_timeout(100)
    de = [x for x in activity(pg) if x['action'] == 'delete']
    check('activity: delete entry keeps a copy', len(de) == 1 and de[0]['summary'] == {'amountCents': 2500, 'merchant': 'Target', 'payer': 'bre'})
    check('activity: add entry survives a delete', any(x['id'] == f'add-{eid}' for x in activity(pg)))
    # Settle
    start_add(pg); keys(pg, '30'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('[data-act=settle]'); pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
    se = [x for x in activity(pg) if x['action'] == 'settle']
    sid = [k for k in st(pg) if k.startswith('settlements/')][0].split('/')[1]
    check('activity: settle entry', len(se) == 1 and se[0]['settlementId'] == sid
          and se[0]['summary'] == {'amountCents': 1500, 'from': 'kyle', 'to': 'bre'})
    c.close()
