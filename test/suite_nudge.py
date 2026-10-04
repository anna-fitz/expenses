from harness import *
import datetime

def nudge(pg): return pg.inner_text('#nudge p') if pg.locator('#nudge').count() else None

def run(b):
    today = datetime.date.today(); ago = lambda n: (today - datetime.timedelta(days=n)).isoformat()
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('nudge: nothing when empty', nudge(pg) is None)
    start_add(pg); keys(pg, '1200'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
    check('nudge: over the amount', nudge(pg) == 'The balance is over $500.')
    check('nudge: one Settle up button', pg.locator('#app [data-act=settle]').count() == 1 and pg.locator('#nudge [data-act=settle]').count() == 1)
    fs_write(pg, 'expenses/old', {'amountCents': 100, 'payer': 'bre', 'merchant': 'Costco', 'category': 'Groceries', 'date': ago(61),
                                  'split': 'half', 'settled': False, 'createdBy': 'bre', 'createdAt': 1})
    check('nudge: both reasons', nudge(pg) == 'It’s been 61 days and the balance is over $500.')
    pg.click('[data-act=profile]'); pg.click('[data-act=open-reminder]'); pg.wait_for_timeout(50)
    check('nudge: settings screen', pg.inner_text('#layer-title') == 'Settle-up reminder'
          and pg.evaluate("[...document.querySelectorAll('#layer legend')].map(l => l.textContent).join('|')") == 'Remind us after|Or when the balance is over'
          and pg.evaluate("document.querySelector('input[name=r-days]:checked').value") == '60'
          and pg.evaluate("document.querySelector('input[name=r-cents]:checked').value") == '50000')
    pg.check('input[name=r-cents][value="0"]'); pg.wait_for_timeout(100)
    check('nudge: setting saved', st(pg)['config/settings']['nudgeCents'] == 0 and pg.inner_text('#toast span') == 'Reminder saved.')
    pg.keyboard.press('Escape')
    check('nudge: days only, never settled', nudge(pg) == 'It’s been 61 days since your first expense.')
    # Review Focus 4: the other phone sees the same reminder
    logout(pg); login(pg, 'kyle')
    check('nudge: partner sees it', nudge(pg) == 'It’s been 61 days since your first expense.')
    pg.click('[data-act=profile]'); pg.click('[data-act=open-reminder]'); pg.check('input[name=r-days][value="0"]'); pg.wait_for_timeout(100)
    pg.keyboard.press('Escape')
    check('nudge: off and off shows nothing', nudge(pg) is None and pg.locator('.hero [data-act=settle]').count() == 1)
    fs_write(pg, 'config/settings', {'nudgeDays': 30})
    fs_write(pg, 'settlements/s1', {'date': ago(40), 'createdAt': 2, 'count': 0, 'amountCents': 0, 'from': None, 'to': None})
    check('nudge: days since the last settle-up', nudge(pg) == 'It’s been 40 days since you settled up.')
    pg.click('#nudge [data-act=settle]'); pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
    check('nudge: gone after settling', nudge(pg) is None)
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg)
    # Review Focus 5: an even balance never trips the amount reminder
    start_add(pg); keys(pg, '1200'); next_step(pg); save_at_store(pg, 'costco')
    start_add(pg); keys(pg, '1200'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'target'); pg.wait_for_timeout(100)
    check('nudge: even balance, no amount reminder', nudge(pg) is None)
    c.close()
