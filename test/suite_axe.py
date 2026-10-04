from harness import *
from axe_playwright_python.sync_playwright import Axe

AXE = Axe()
OPTS = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag21a"]}}

def scan(pg, name):
    r = AXE.run(pg, options=OPTS)
    check(f'axe A: {name}', r.violations_count == 0)
    if r.violations_count: print(f'--- axe: {name} ---\n' + r.generate_report())

def run(b):
    # Self-check: the scanner must catch a planted violation, or every "pass" below means nothing.
    c = new_ctx(b); pg = open_app(c)
    pg.evaluate("document.body.insertAdjacentHTML('beforeend', '<button id=planted></button><input id=planted2>')")
    r = AXE.run(pg, options=OPTS)
    check('axe self-check: catches unnamed button and unlabelled input', r.violations_count >= 2)
    c.close()
    for scheme in ('light', 'dark'):
        c = new_ctx(b, scheme); pg = open_app(c)
        scan(pg, f'{scheme} login')
        login(pg); scan(pg, f'{scheme} home empty')
        start_add(pg); keys(pg, '12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
        scan(pg, f'{scheme} home with expense + toast')
        start_add(pg); scan(pg, f'{scheme} add step 1')
        pg.click('[data-act=bill][data-id=water]'); scan(pg, f'{scheme} add step 1 bill')
        pg.click('[data-act=clear-bill]'); keys(pg, '7'); next_step(pg); scan(pg, f'{scheme} add step 2')
        open_details(pg); scan(pg, f'{scheme} add step 2 details')
        pg.fill('#w-q', 'Blue Bottle'); pg.check('input[name=store][value=__new__]'); pg.click('#w-save')
        scan(pg, f'{scheme} add step 2 new store + error')
        pg.keyboard.press('Escape')
        eid = [k for k in st(pg) if k.startswith('expenses/')][0].split('/')[1]
        pg.click(f'[data-act=edit][data-id="{eid}"]'); scan(pg, f'{scheme} edit')
        pg.fill('#e-amt', ''); pg.click('[data-act=e-save]'); scan(pg, f'{scheme} edit error')
        pg.keyboard.press('Escape')
        pg.click('[data-act=settle]'); scan(pg, f'{scheme} settle')
        pg.click('#s-go'); pg.click('#s-go'); pg.wait_for_timeout(150)
        pg.click('[data-act=profile]'); scan(pg, f'{scheme} profile'); pg.click('[data-act=close]')
        open_history(pg); scan(pg, f'{scheme} history settle-ups')
        pg.click('[data-act=detail]'); pg.wait_for_timeout(150); scan(pg, f'{scheme} settle detail'); pg.click('[data-act=close]')
        pg.check('input[name=h-tab][value=activity]'); pg.wait_for_timeout(100); scan(pg, f'{scheme} history activity')
        go_home(pg)
        open_stores(pg); scan(pg, f'{scheme} stores list')
        pg.click('[data-act=store-open][data-id=target]'); pg.click('#sm-go'); scan(pg, f'{scheme} store detail + error')
        pg.fill('#sd-name', 'Costco'); pg.click('[data-act=store-rename]'); scan(pg, f'{scheme} store rename conflict')
        pg.click('[data-act=store-back]'); pg.click('[data-act=lists-back]'); pg.click('[data-act=open-bills]'); scan(pg, f'{scheme} bills list')
        pg.click('[data-act=bill-new]'); pg.click('[data-act=bill-save]'); scan(pg, f'{scheme} bill form + error')
        pg.keyboard.press('Escape')
        for _ in range(2): start_add(pg); keys(pg, '12'); next_step(pg); save_at_store(pg, 'costco'); pg.wait_for_timeout(100)
        scan(pg, f'{scheme} duplicate warning')
        pg.keyboard.press('Escape')
        go_home(pg) if pg.locator('[data-act=home]').count() else None
        pg.click('[data-act=profile]'); pg.fill('#p-venmo', 'x'); pg.click('[data-act=venmo-save]'); scan(pg, f'{scheme} profile Venmo error')
        pg.click('[data-act=open-reminder]'); scan(pg, f'{scheme} reminder settings'); pg.keyboard.press('Escape')
        fs_write(pg, 'config/profile-kyle', {'venmo': 'Kyle-Test'})
        start_add(pg); keys(pg, '1200'); set_payer(pg, 'kyle'); next_step(pg); save_at_store(pg, 'target'); pg.wait_for_timeout(100)
        scan(pg, f'{scheme} home with reminder')
        pg.click('#nudge [data-act=settle]'); scan(pg, f'{scheme} settle with Venmo link')
        pg.evaluate("document.addEventListener('click', e => { if (e.target.closest('a[data-act=venmo]')) e.preventDefault(); }, true)")
        pg.click('a[data-act=venmo]'); pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(50)
        scan(pg, f'{scheme} settle after Venmo')
        pg.click('[data-act=venmo-no]'); pg.keyboard.press('Escape')
        c.close()
