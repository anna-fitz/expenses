from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    toast_btn(pg, 'edit'); pg.wait_for_selector('#e-amt')
    check('edit: the toast’s Edit opens it', pg.inner_text('#layer-title') == 'Edit expense' and pg.input_value('#e-amt') == '45.12'
          and pg.input_value('#e-store') == 'Costco' and pg.title() == 'Edit expense · Expenses')
    check('edit: groups labelled', pg.inner_text('#e-payer-set legend') == 'Paid by' and pg.inner_text('#e-split-set legend') == 'Split')
    close_sheet(pg)
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt')
    check('edit: a Home row opens it', pg.input_value('#e-amt') == '45.12' and pg.evaluate('document.activeElement.id') == 'layer-title')
    pg.fill('#e-amt', 'abc'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(50)
    check('edit: amount error, linked', pg.inner_text('#e-err') == 'Enter an amount, like 24.99' and pg.get_attribute('#e-amt', 'aria-invalid') == 'true'
          and 'e-err' in (pg.get_attribute('#e-amt', 'aria-describedby') or '') and pg.evaluate('document.activeElement.id') == 'e-amt')
    pg.fill('#e-amt', '100001'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(50)
    check('edit: an amount over $100,000 is refused', pg.get_attribute('#e-amt', 'aria-invalid') == 'true' and f'expenses/{eid}' in st(pg)
          and st(pg)[f'expenses/{eid}']['amountCents'] == 4512)
    pg.fill('#e-amt', '25'); pg.fill('#e-store', ' '); pg.click('[data-act=e-save]'); pg.wait_for_timeout(50)
    check('edit: the error moves to the store', pg.inner_text('#e-err') == 'Add where it was from' and pg.get_attribute('#e-store', 'aria-invalid') == 'true'
          and pg.get_attribute('#e-amt', 'aria-invalid') is None and pg.evaluate('document.activeElement.id') == 'e-store')
    pg.fill('#e-store', 'Target'); pg.check('input[name=e-payer][value=p2]'); pg.check('input[name=e-split][value=full]')
    pg.click('[data-act=e-save]'); pg.wait_for_timeout(150)
    e = st(pg)[f'expenses/{eid}']
    check('edit: saved', e['amountCents'] == 2500 and e['merchant'] == 'Target' and e['payer'] == 'p2' and e['split'] == 'full'
          and e['updatedBy'] == 'p1' and not sheet_open(pg) and 'Changes saved.' in toast_text(pg))
    ed = [x for x in activity(pg) if x['action'] == 'edit']
    check('edit: logs only what changed, summarized from before', len(ed) == 1 and ed[0]['expenseId'] == eid and ed[0]['by'] == 'p1'
          and ed[0]['summary'] == {'amountCents': 4512, 'merchant': 'Costco', 'payer': 'p1'}
          and ed[0]['changes'] == [{'field': 'amountCents', 'from': 4512, 'to': 2500}, {'field': 'payer', 'from': 'p1', 'to': 'p2'},
                                   {'field': 'merchant', 'from': 'Costco', 'to': 'Target'}, {'field': 'split', 'from': 'half', 'to': 'full'}])
    before = len(activity(pg)); upd = st(pg)[f'expenses/{eid}']['updatedAt']
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(150)
    check('edit: no change writes nothing', len(activity(pg)) == before and st(pg)[f'expenses/{eid}']['updatedAt'] == upd and 'Nothing changed.' in toast_text(pg))
    fs_write(pg, 'merchants/target', {'hidden': True, 'mergedInto': 'costco'})
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt')
    check('edit: shows the store’s current name', pg.input_value('#e-store') == 'Costco')
    pg.click('[data-act=e-save]'); pg.wait_for_timeout(150)
    check('edit: an aliased expense saved unchanged logs nothing', len(activity(pg)) == before)
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt')
    pg.click('[data-act=e-delete]')
    check('edit: delete asks once more', pg.inner_text('#e-del') == 'Tap again to delete' and f'expenses/{eid}' in st(pg))
    pg.click('[data-act=e-delete]'); pg.wait_for_timeout(200)
    de = [x for x in activity(pg) if x['action'] == 'delete']
    check('edit: deleted and logged', f'expenses/{eid}' not in st(pg) and len(de) == 1
          and de[0]['summary'] == {'amountCents': 2500, 'merchant': 'Target', 'payer': 'p2'} and any(x['id'] == f'add-{eid}' for x in activity(pg))
          and 'Expense deleted.' in toast_text(pg) and not sheet_open(pg))
    check('edit: your own delete isn’t reported as the other phone’s', 'isn’t here anymore' not in toast_text(pg))
    # Review Focus 3: changed on the other phone while open
    start_add(pg); keys(pg, '7'); next_step(pg); save_at_store(pg, 'costco')
    gid = [k for k, v in st(pg).items() if k.startswith('expenses/') and v['amountCents'] == 700][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{gid}"]'); pg.wait_for_selector('#e-amt')
    n = len(activity(pg)); fs_delete(pg, f'expenses/{gid}'); pg.wait_for_timeout(250)
    check('edit: deleted on the other phone closes the sheet and says so', not sheet_open(pg) and 'isn’t here anymore' in toast_text(pg)
          and len(activity(pg)) == n)
    # Review Focus 2: a link to a missing expense
    pg.evaluate("location.hash = '#/edit/nope'"); pg.wait_for_timeout(250)
    check('edit: a link to a missing expense lands on Home', not sheet_open(pg) and pg.evaluate('location.hash') == '#/')
    # Final review: a quick double tap on Save or Delete writes once (the log can't be cleaned up afterwards)
    start_add(pg); keys(pg, '8'); next_step(pg); save_at_store(pg, 'costco')
    did = [k for k, v in st(pg).items() if k.startswith('expenses/') and v['amountCents'] == 800][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{did}"]'); pg.wait_for_selector('#e-amt'); pg.fill('#e-amt', '9')
    pg.dblclick('[data-act=e-save]'); pg.wait_for_timeout(250)
    check('edit: a double tap on Save logs one edit', len([x for x in activity(pg) if x['action'] == 'edit' and x['expenseId'] == did]) == 1)
    pg.click(f'[data-act=edit][data-id="{did}"]'); pg.wait_for_selector('#e-amt'); pg.click('[data-act=e-delete]'); pg.dblclick('[data-act=e-delete]'); pg.wait_for_timeout(250)
    check('edit: a double tap on Delete logs one delete', len([x for x in activity(pg) if x['action'] == 'delete' and x['expenseId'] == did]) == 1)
    c.close()
