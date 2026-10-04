from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    check('layers: home title', pg.title() == 'Expenses')
    check('layers: #app not a live region', pg.evaluate("document.getElementById('app').getAttribute('aria-live')") is None)
    check('layers: announcer exists', pg.evaluate("(document.getElementById('announcer')||{}).getAttribute?.('aria-live')") == 'polite')
    start_add(pg)
    check('layers: focus moves to title', pg.evaluate('document.activeElement.id') == 'layer-title')
    check('layers: dialog named by title', pg.evaluate("document.getElementById('layer').getAttribute('aria-labelledby')") == 'layer-title')
    check('layers: home inert while open', pg.evaluate("document.getElementById('app').inert") is True)
    check('layers: page title follows screen', pg.title() == 'Add expense · Expenses')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(50)
    check('layers: focus returns to opener', pg.evaluate('document.activeElement.dataset.act') == 'add')
    check('layers: home not inert after close', pg.evaluate("document.getElementById('app').inert") is False)
    # focus survives a data refresh after saving
    start_add(pg); keys(pg, '5'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(250)
    check('layers: focus kept on Add after data refresh', pg.evaluate('document.activeElement.dataset.act') == 'add')
    # toast: persistent with actions, dismissible, hidden when a layer opens
    check('toast: has Dismiss', pg.locator('#toast [aria-label=Dismiss]').count() == 1)
    pg.wait_for_timeout(10000)
    check('toast: still visible after 10s', pg.is_visible('#toast'))
    pg.click('#toast [aria-label=Dismiss]')
    check('toast: Dismiss hides it', not pg.is_visible('#toast'))
    start_add(pg); keys(pg, '6'); next_step(pg); save_at_store(pg, 'costco')
    start_add(pg)
    check('toast: hidden when a screen opens', not pg.is_visible('#toast'))
    c.close()
    # Final review #3: focus after toast actions
    c = new_ctx(b); pg = open_app(c); login(pg)
    for amt in ('1', '2', '3', '4', '5', '6', '7'):
        start_add(pg); keys(pg, amt); next_step(pg); save_at_store(pg, 'costco')
    pg.wait_for_timeout(150)
    # Final review #9: the persistent toast must not hide the last row
    pg.evaluate("document.querySelector('#app .scroll').scrollTop = 1e6"); pg.wait_for_timeout(100)
    last = pg.evaluate("[...document.querySelectorAll('#app .row')].pop().getBoundingClientRect().bottom")
    toast_top = pg.evaluate("document.getElementById('toast').getBoundingClientRect().top")
    check('toast: last row can scroll clear of the toast', last <= toast_top + 1)
    pg.click('#toast [data-toast="x"]'); pg.wait_for_timeout(50)
    check('toast: focus after Dismiss goes to Add', pg.evaluate('document.activeElement.dataset.act') == 'add')
    start_add(pg); keys(pg, '9'); next_step(pg); save_at_store(pg, 'costco')
    pg.click('#toast [data-toast="0"]'); pg.wait_for_timeout(100)
    check('toast: focus after Undo goes to Add', pg.evaluate('document.activeElement.dataset.act') == 'add')
    c.close()
