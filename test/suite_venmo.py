from harness import *
import datetime, urllib.parse

def md(d): return f"{d:%b} {d.day}"

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    pg.click('[data-act=profile]')
    check('venmo: Getting paid section', pg.inner_text('label[for=p-venmo]') == 'Your Venmo username'
          and pg.inner_text('#p-venmo-help') == 'The part after @. Kyle’s phone uses this to pay or request from you.')
    pg.fill('#p-venmo', 'a b'); pg.click('[data-act=venmo-save]')
    check('venmo: invalid username error', pg.inner_text('#p-venmo-err') == 'Use 5–30 letters, numbers, dashes, or underscores'
          and pg.get_attribute('#p-venmo', 'aria-invalid') == 'true' and 'p-venmo-err' in pg.get_attribute('#p-venmo', 'aria-describedby')
          and pg.evaluate('document.activeElement.id') == 'p-venmo')
    # Review Focus 1: a partner's profile update doesn't wipe what's typed
    pg.fill('#p-venmo', '@Test-Us'); fs_write(pg, 'config/profile-kyle', {'emoji': '🐶', 'updatedAt': 1})
    check('venmo: typing survives a partner update', pg.input_value('#p-venmo') == '@Test-Us')
    pg.fill('#p-venmo', '@Test-User_1'); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(100)
    check('venmo: saved without @', st(pg)['config/profile-bre']['venmo'] == 'Test-User_1' and pg.inner_text('#toast span') == 'Venmo username saved.'
          and pg.input_value('#p-venmo') == 'Test-User_1')
    pg.fill('#p-venmo', ''); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(100)
    check('venmo: cleared', st(pg)['config/profile-bre']['venmo'] is None and pg.inner_text('#toast span') == 'Venmo username removed.')
    pg.click('[data-act=close]')
    c.close()
