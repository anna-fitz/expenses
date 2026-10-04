from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'insights')
    check('insights: empty at first', pg.inner_text('#stats-empty') == 'Stats show up once you add expenses.' and 'Coming soon' not in pg.inner_text('main'))
    fs_write(pg, 'merchants/costco-old', {'name': 'Costco Old', 'hidden': True, 'mergedInto': 'costco'})
    fs_batch(pg, [exp_row('e1', 4512, 'p1', 'half', ago(3)), ('expenses/e2', dict(exp_row('e2', 1000, 'p2', 'half', ago(2))[1], merchant='Costco Old')),
                  ('expenses/e3', dict(exp_row('e3', 40000, 'p1', 'half', ago(1))[1], merchant='Target'))])
    stats = pg.evaluate("[...document.querySelectorAll('#stats .stat')].map(s => s.innerText.replace(/\\s+/g, ' ').trim())")
    check('insights: this period', pg.inner_text('#stats-h') == 'This period' and stats == [
        'Days since your first expense 3', 'Shared spending $455.12', 'Top store Costco 2 expenses', 'Biggest expense $400.00 Target'])
    fs_write(pg, 'settlements/s1', {'date': ago(5), 'createdAt': 1, 'from': None, 'to': None, 'amountCents': 0, 'count': 0})
    check('insights: counts from the last settle-up', 'Days since you settled up 5' in ' '.join(pg.inner_text('#stats').split()))
    c.close()
