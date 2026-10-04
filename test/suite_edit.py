from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg); keys(pg, '12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    pg.click('#toast [data-toast="x"]')
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{eid}"]')
    check('edit: paid-by group', pg.inner_text('#e-payer-set legend') == 'Paid by')
    check('edit: split group', pg.inner_text('#e-split-set legend') == 'Split')
    pg.fill('#e-amt', 'abc'); pg.click('[data-act=e-save]')
    check('edit: amount error linked', pg.get_attribute('#e-amt', 'aria-invalid') == 'true'
          and 'e-err' in (pg.get_attribute('#e-amt', 'aria-describedby') or '') and pg.evaluate('document.activeElement.id') == 'e-amt')
    pg.fill('#e-amt', '12'); pg.fill('#e-store', ''); pg.click('[data-act=e-save]')
    check('edit: store error linked', pg.get_attribute('#e-store', 'aria-invalid') == 'true' and pg.evaluate('document.activeElement.id') == 'e-store'
          and pg.get_attribute('#e-amt', 'aria-invalid') is None)
    pg.fill('#e-store', 'Costco'); pg.check('input[name=e-payer][value=kyle]'); pg.check('input[name=e-split][value=full]'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    e = st(pg)[f'expenses/{eid}']
    check('edit: radios saved', e['payer'] == 'kyle' and e['split'] == 'full')
    c.close()
