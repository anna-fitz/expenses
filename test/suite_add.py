from harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    start_add(pg)
    check('add1: big title', pg.evaluate("parseFloat(getComputedStyle(document.getElementById('layer-title')).fontSize)") >= 26)
    check('add1: step marker', pg.inner_text('#layer .step') == 'Step 1 of 2')
    check('add1: visible Amount label', pg.is_visible('#amt-label') and pg.inner_text('#amt-label') == 'Amount')
    check('add1: amount group labelled', pg.evaluate("document.querySelector('[aria-labelledby=amt-label]') !== null"))
    check('add1: hint', pg.inner_text('#amt-hint') == 'Type it in, or pick a bill.')
    check('add1: paid-by legend', pg.inner_text('#payer-set legend') == 'Paid by')
    check('add1: You first and checked', pg.evaluate("[...document.querySelectorAll('input[name=payer]')].map(i => i.value + (i.checked ? '*' : '')).join()") == 'bre*,kyle')
    check('add1: Bills heading', pg.inner_text('#bills-h') == 'Bills')
    check('add1: Next label', pg.inner_text('[data-act=next]') == 'Next: choose store')
    pg.check('input[name=payer][value=kyle]'); keys(pg, '12')
    check('add1: payer kept after typing', pg.evaluate("document.querySelector('input[name=payer]:checked').value") == 'kyle')
    pg.click('[data-act=bill][data-id=internet]'); pg.wait_for_timeout(50)
    check('add1: bill label', pg.inner_text('[data-act=next]') == 'Save Internet, $80.00')
    pg.click('[data-act=key][data-k=back]'); pg.click('[data-act=key][data-k=back]'); keys(pg, '5')   # 80.00 → 80.0 → 80. → 80.5
    check('add1: bill label follows edits', pg.inner_text('[data-act=next]') == 'Save Internet, $80.50')
    pg.wait_for_timeout(700)
    check('add1: amount announced', pg.inner_text('#announcer').startswith('Amount $'))
    pg.keyboard.press('Escape')
    c.close()
    # Review Focus 1: small screen overlap
    c = new_ctx(b, 'light', (375, 667)); pg = open_app(c); login(pg); start_add(pg)
    keys_box = pg.locator('#layer .keys').bounding_box(); dock_box = pg.locator('#layer .dock').bounding_box()
    check('add1: small screen keypad clear of bottom bar', keys_box['y'] + keys_box['height'] <= dock_box['y'] + 1)
    c.close()
