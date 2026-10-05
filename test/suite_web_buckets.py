from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'settings')
    check('buckets: a row under Shared', pg.locator('#shared-h ~ ul [data-act=buckets]').count() == 1 and 'Needs and wants' in pg.inner_text('[data-act=buckets]'))
    pg.click('[data-act=buckets]'); pg.wait_for_timeout(200)
    legends = pg.evaluate("[...document.querySelectorAll('fieldset[id^=bk-] legend')].map(l => l.textContent)")
    check('buckets: every category, A–Z with Other last', pg.inner_text('#screen-title') == 'Needs and wants' and legends[0] == 'Car & fuel' and legends[-1] == 'Other'
          and len(legends) == 12 and 'Insights recalculates every month, including before the app.' in pg.inner_text('main'))
    check('buckets: the defaults', checked(pg, 'bk-utilities') == 'need' and checked(pg, 'bk-groceries') == 'need' and checked(pg, 'bk-coffee') == 'want'
          and pg.evaluate("[...document.querySelectorAll('#bk-coffee-set label')].map(l => l.innerText.trim()).join()") == 'Need,Want'
          and 'Bills' not in legends)
    pg.check('input[name=bk-coffee][value=need]'); pg.wait_for_timeout(200)
    s = st(pg).get('config/settings', {})
    check('buckets: a tap saves the whole map for both of you', s.get('buckets', {}).get('Coffee') == 'need' and s['buckets'].get('Groceries') == 'need'
          and len(s['buckets']) == 12 and s.get('updatedBy') == 'p1' and 'Saved.' in toast_text(pg) and checked(pg, 'bk-coffee') == 'need')
    fs_write(pg, 'config/settings', {'buckets': dict(s['buckets'], Coffee='want')}); pg.wait_for_timeout(150)
    check('buckets: a change from the other phone shows here', checked(pg, 'bk-coffee') == 'want')
    c.close()
