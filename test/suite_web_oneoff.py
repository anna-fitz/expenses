from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '1508.49'); next_step(pg); pg.check('input[name=store][value=costco]')
    open_details(pg)
    check('oneoff: a labelled checkbox in Details', pg.inner_text('label[for=o-oneoff]') == 'One-off purchase'
          and pg.get_attribute('#o-oneoff', 'aria-checked') == 'false' and 'Big, rare purchases like a dishwasher.' in pg.inner_text('#details'))
    pg.click('#o-oneoff'); details_done(pg); next_step(pg)
    check('oneoff: review shows it', rv(pg, 'oneoff') == 'Yes')
    log_it(pg)
    e = [x for x in expenses(pg) if x['amountCents'] == 150849][0]
    check('oneoff: saved on the expense', e.get('oneOff') is True)
    start_add(pg); keys(pg, '12'); next_step(pg); pg.check('input[name=store][value=costco]'); next_step(pg)
    check('oneoff: no row when it isn’t one', pg.locator('[data-row=oneoff]').count() == 0)
    log_it(pg)
    plain = [x for x in expenses(pg) if x['amountCents'] == 1200][0]
    check('oneoff: and nothing written when unticked', 'oneOff' not in plain)
    eid = [k for k, v in st(pg).items() if k.startswith('expenses/') and v['amountCents'] == 150849][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.wait_for_selector('#e-amt'); pg.wait_for_timeout(250)
    check('oneoff: Edit shows it ticked', pg.get_attribute('#e-oneoff', 'aria-checked') == 'true' and pg.inner_text('label[for=e-oneoff]') == 'One-off purchase')
    pg.click('#e-oneoff'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(200)
    e = st(pg)[f'expenses/{eid}']
    log = [x for x in activity(pg) if x['action'] == 'edit'][-1]
    check('oneoff: unticking in Edit writes false and logs it', e.get('oneOff') is False and log['changes'] == [{'field': 'oneOff', 'from': True, 'to': ''}])
    c.close()
