from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    open_history(pg)
    check('history: tabs', pg.evaluate("[...document.querySelectorAll('input[name=h-tab]')].map(i => i.value + (i.checked ? '*' : '')).join()") == 'settle*,activity')
    pg.check('input[name=h-tab][value=activity]'); pg.wait_for_timeout(100)
    check('history: empty activity', 'Changes to expenses will show up here.' in pg.inner_text('#app'))
    check('history: tab keeps focus', pg.evaluate("document.activeElement.value") == 'activity')
    go_home(pg)
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.fill('#e-amt', '25'); pg.fill('#e-store', 'Target'); pg.click('[data-act=e-save]'); pg.wait_for_timeout(100)
    pg.click(f'[data-act=edit][data-id="{eid}"]'); pg.click('[data-act=e-delete]'); pg.click('[data-act=e-delete]'); pg.wait_for_timeout(100)
    open_history(pg)
    check('history: tab remembered', pg.evaluate("document.querySelector('input[name=h-tab]:checked').value") == 'activity')
    pg.wait_for_timeout(100)
    lines = pg.evaluate("[...document.querySelectorAll('.act .t')].map(e => e.textContent)")
    check('history: activity sentences newest first', lines == [
        'Bre deleted $25.00 at Target',
        'Bre changed Costco: amount $45.12 → $25.00, store Costco → Target',
        'Bre added $45.12 at Costco'])
    check('history: grouped under Today', pg.inner_text('#app .group h2') == 'Today')
    check('history: shows time', pg.evaluate("/\\d:\\d\\d [AP]M/.test(document.querySelector('.act .s').textContent)"))
    check('history: no Show more under limit', pg.locator('[data-act=more-activity]').count() == 0)
    c.close()
    # copy: long edits and settle lines
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => {
      const N = {bre: 'Bre', kyle: 'Kyle'};
      return [
        m.activityLine({by: 'kyle', action: 'edit', summary: {merchant: 'Costco'}, changes: [
          {field: 'amountCents', from: 100, to: 200}, {field: 'payer', from: 'bre', to: 'kyle'}, {field: 'split', from: 'half', to: 'full'},
          {field: 'date', from: '2026-10-01', to: '2026-10-02'}, {field: 'note', from: '', to: 'Gift'}]}, N),
        m.activityLine({by: 'kyle', action: 'settle', summary: {amountCents: 69022, from: 'bre', to: 'kyle'}}, N),
        m.activityLine({by: 'bre', action: 'settle', summary: {amountCents: 0, from: null, to: null}}, N)];
    })""")
    check('history: edit capped at 3', r[0] == 'Kyle changed Costco: amount $1.00 → $2.00, paid by Bre → Kyle, split 50/50 → owed in full, and 2 more')
    check('history: settle line', r[1] == 'Kyle settled up: Bre paid Kyle $690.22')
    check('history: even settle line', r[2] == 'Bre closed an even period')
    c.close()
