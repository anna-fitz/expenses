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
