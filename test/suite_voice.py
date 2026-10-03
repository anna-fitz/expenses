from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    h1 = pg.inner_text('#app h1')
    check('voice: greeting', h1 in ('Good morning, Bre', 'Good afternoon, Bre', 'Good evening, Bre'))
    check('voice: even line', pg.inner_text('.hero .who') == 'You’re even' and pg.inner_text('.hero .sub') == 'All square.')
    start_add(pg); keys(pg, '45.12'); next_step(pg); save_at_store(pg, 'costco')
    check('voice: saved toast', pg.inner_text('#toast span') == 'Got it. $45.12 at Costco.')
    pg.wait_for_timeout(100)
    check('voice: Kyle owes you (Bre paid)', pg.inner_text('.hero .who') == 'Kyle owes you')
    check('voice: legend says You paid', 'You paid $45.12' in pg.inner_text('.legend'))
    check('voice: since line, no settle', pg.inner_text('.since') == '1 expense so far')
    logout(pg); login(pg, 'kyle')
    check('voice: You owe Bre (Kyle viewing)', pg.inner_text('.hero .who') == 'You owe Bre')
    c.close()
    # pure functions
    c = new_ctx(b); pg = open_app(c)
    r = pg.evaluate("""import('./copy.js').then(m => [
      m.greeting('Bre', 4), m.greeting('Bre', 5), m.greeting('Bre', 12), m.greeting('Bre', 17),
      m.sinceLine(6, '2026-09-01', 32), m.sinceLine(1, '2026-09-01', 0), m.sinceLine(2, '2026-09-01', 1), m.sinceLine(0, null, 0),
      m.savedLine('$780.00', 'Electricity', {name: 'Electricity', overUsual: '$645.55'}), m.savedLine('$80.00', 'Internet', {name: 'Internet', overUsual: null})])""")
    check('voice: greeting boundaries', r[:4] == ['Good evening, Bre', 'Good morning, Bre', 'Good afternoon, Bre', 'Good evening, Bre'])
    check('voice: since with days', r[4] == '6 expenses since you settled on Sep 1, 32 days ago')
    check('voice: since today / 1 day', r[5].endswith('settled on Sep 1, today') and r[6].endswith('1 day ago'))
    check('voice: nothing yet', r[7] == 'No expenses yet')
    check('voice: bill over usual', r[8] == 'Got it. $780.00 for Electricity. That’s more than the usual $645.55.')
    check('voice: bill normal', r[9] == 'Got it. $80.00 for Internet.')
    c.close()
