from web_harness import *

M = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']
EVERY = {'2026-01': (50000, 30000), '2026-02': (60000, 30000), '2026-03': (70000, 30000), '2026-04': (60000, 30000),
         '2026-05': (60000, 20000), '2026-06': (60000, 40000), '2026-07': (51000, 30000)}
HISTORY = {'through': '2026-07', 'months': {m: {'cats': {'Groceries': g, 'Dining & takeout': d}, 'bills': {'electricity': 64555},
                                               'oneOffs': {}, 'oneOffCount': 0} for m, (g, d) in EVERY.items()}}   # made up, never real data
def money(c): return '${:,.2f}'.format(c / 100)
def mix(months, buckets):
    rows = []
    for m in months:
        g, d = EVERY[m]; t = g + d + 64555; b = {'bill': 64555, 'need': 0, 'want': 0}
        b[buckets.get('Groceries', 'need')] += g; b[buckets.get('Dining & takeout', 'want')] += d
        rows.append({k: v / t for k, v in b.items()})
    return {k: round(sum(r[k] for r in rows) / len(rows) * 100) for k in ('bill', 'need', 'want')}
def at(b, day):
    c = new_ctx(b); c.add_init_script(f"window.__today = '{day}'"); pg = open_app(c); login(pg)
    fs_write(pg, 'config/history', HISTORY)
    fs_batch(pg, [('expenses/i1', dict(exp_row('i1', 40000, 'p1', 'half', '2026-08-05')[1])),
                  ('expenses/i2', dict(exp_row('i2', 20000, 'p2', 'half', '2026-08-10')[1], category='Dining & takeout', merchant='Chipotle')),
                  ('expenses/i3', dict(exp_row('i3', 64555, 'p2', 'half', '2026-08-02')[1], category='Utilities', merchant='Electricity', billId='electricity')),
                  ('expenses/i4', dict(exp_row('i4', 150849, 'p1', 'half', '2026-08-12')[1], category='Home & household', oneOff=True)),
                  ('expenses/old', dict(exp_row('old', 99999, 'p1', 'half', '2026-07-15')[1]))])   # inside the summary's months: must be ignored
    tab(pg, 'insights'); pg.wait_for_selector('#ontrack'); pg.wait_for_timeout(150)
    return c, pg

def run(b):
    c, pg = at(b, '2026-08-20')
    check('insights: no more Coming soon or old stats', 'Coming soon' not in pg.inner_text('main') and pg.locator('#stats').count() == 0)
    check('insights: the month picker', pg.inner_text('#month-label') == 'August 2026' and pg.is_disabled('[data-act=month-next]')
          and pg.locator('[data-act=month-now]').count() == 0 and pg.get_attribute('[data-act=month-prev]', 'aria-label') == 'Previous month')
    check('insights: on track', pg.inner_text('#ontrack-status') == 'On track'
          and pg.inner_text('#ontrack-line') == '$600.00 so far · usually $580.65 by now'
          and pg.inner_text('#ontrack-bills') == 'Bills so far: $645.55 · usually $645.55 a month'
          and pg.inner_text('#ontrack-oneoffs') == 'One-offs: $1,508.49 · 1 purchase')
    pg.click('#usual-how summary')
    check('insights: how usual is worked out', 'middle value of the six months before this one' in pg.inner_text('#usual-how'))
    want = mix(M[1:], {})
    lines = {k: pg.inner_text(f'#needs [data-bucket={k}]') for k in ('bill', 'need', 'want')}
    check('insights: needs vs. wants', lines == {'bill': f"Bills $645.55 · 23% (usual {want['bill']}%)",
                                                   'need': f"Needs $1,908.49 · 69% (usual {want['need']}%)",
                                                   'want': f"Wants $200.00 · 7% (usual {want['want']}%)"})
    check('insights: no who-paid anywhere', 'Alex' not in pg.inner_text('main') and 'Sam' not in pg.inner_text('main'))
    fs_batch(pg, [('expenses/i5', dict(exp_row('i5', 10000, 'p1', 'half', '2026-08-18')[1], category='Dining & takeout'))]); pg.wait_for_timeout(200)
    check('insights: running high, with an icon', pg.inner_text('#ontrack-status') == 'Running high' and pg.locator('#ontrack svg').count() >= 1)
    # The 12-month sheet
    pg.click('[data-act=needs-open]'); pg.wait_for_selector('#needs-table'); pg.wait_for_timeout(250)
    rows = pg.evaluate("[...document.querySelectorAll('#needs-table tbody tr')].map(r => [...r.cells].map(c => c.textContent.trim()))")
    check('insights: the sheet has a chart and a 12-month table', pg.inner_text('#layer-title') == 'Needs vs. wants' and pg.locator('#needs-chart svg').count() == 1
          and len(rows) == 12 and rows[0][0] == 'Sep 2025' and rows[-1][0] == 'Aug 2026' and rows[-2] == ['Jul 2026', '$645.55', '$510.00', '$300.00']
          and rows[0][1:] == ['—', '—', '—'] and pg.evaluate('location.hash') == '#/insights/2026-08/needs')
    check('insights: the chart has a legend', [t.strip() for t in pg.inner_text('#needs-chart .legend').split('\n') if t.strip()] == ['Bills', 'Needs', 'Wants'])
    close_sheet(pg)
    # A past month, and not enough history
    pg.click('[data-act=month-prev]'); pg.wait_for_timeout(200)
    check('insights: a past month from the summary', pg.inner_text('#month-label') == 'July 2026' and pg.evaluate('location.hash') == '#/insights/2026-07'
          and pg.inner_text('#ontrack-line') == 'July 2026 · $810.00 everyday · usual $900.00 · 10% below usual'
          and pg.inner_text('#ontrack-bills') == 'Bills: $645.55' and pg.inner_text('#ontrack-oneoffs') == 'One-offs: none'
          and pg.locator('[data-act=month-now]').count() == 1)
    pg.evaluate("location.hash = '#/insights/2026-01'"); pg.wait_for_timeout(200)
    check('insights: not enough history', pg.inner_text('#ontrack').count('Not enough history yet to say what’s usual.') == 1 and pg.is_disabled('[data-act=month-prev]'))
    pg.click('[data-act=month-now]'); pg.wait_for_timeout(200)
    check('insights: back to this month', pg.inner_text('#month-label') == 'August 2026')
    # The mapping recalculates every month, history included
    fs_write(pg, 'config/settings', {'buckets': {'Dining & takeout': 'need'}}); pg.wait_for_timeout(200)
    check('insights: the mapping recalculates history', pg.inner_text('#needs [data-bucket=want]') == 'Wants $0.00 · 0% (usual 0%)')
    c.close()
    c, pg = at(b, '2026-08-03')
    check('insights: early days', pg.inner_text('#ontrack-status') == 'Early days')
    c.close()
