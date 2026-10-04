from web_harness import *

def no_personal(pg):
    t = text_and_html(pg)
    return not any(s in t for s in ('Alex', 'Sam', ACC['a'], ACC['b']))

def run(b):
    c = new_ctx(b); pg = open_app(c)
    check('shell: sign-in heading matches the app name', pg.inner_text('#login-form h1') == 'Expenses')
    check('privacy: sign-in title and note', pg.title() == 'Sign in · Expenses'
          and pg.inner_text('#signin-note') == 'Only the two people this app is for can sign in. Passwords are stored scrambled. Nobody can read them.')
    check('privacy: nothing personal before sign-in', no_personal(pg))
    pg.fill('#l-email', ACC['a']); pg.fill('#l-pass', 'wrong'); pg.click('#l-btn'); pg.wait_for_timeout(150)
    check('shell: wrong password', pg.inner_text('#l-err') == 'That email and password don’t match.' and pg.get_attribute('#l-email', 'aria-invalid') == 'true')
    check('privacy: nothing personal after a failed sign-in', no_personal(pg))
    pg.fill('#l-email', ''); pg.click('[data-act=forgot]')
    check('shell: forgot needs an email', pg.inner_text('#l-err') == 'Enter your email first, then tap Forgot password.')
    pg.fill('#l-email', ACC['stranger']); pg.fill('#l-pass', 'correct-horse'); pg.click('#l-btn'); pg.wait_for_timeout(250)
    check('privacy: nothing personal on Not set up', 'Not set up for this app' in pg.inner_text('body') and no_personal(pg))
    sign_out_button(pg, reseed=True)
    login(pg)
    check('shell: home after sign in', pg.title() == 'Expenses' and pg.get_attribute('[data-act=tab-home]', 'aria-current') == 'page'
          and pg.inner_text('#screen-title').startswith(('Morning, Alex', 'Afternoon, Alex', 'Evening, Alex')))
    check('shell: room above the Home title', title_top(pg) >= 40)
    check('shell: four tabs in a labelled nav', pg.evaluate("document.querySelector('nav[aria-label=Main]').querySelectorAll('a').length") == 4)
    for name, title in (('history', 'History'), ('insights', 'Insights'), ('settings', 'Settings')):
        tab(pg, name)
        check(f'shell: {name} tab', pg.inner_text('#screen-title') == title and pg.title() == f'{title} · Expenses'
              and pg.evaluate('document.activeElement.id') == 'screen-title' and pg.evaluate('location.hash') == f'#/{name}'
              and title_top(pg) >= 40)
    check('session: sign-out note', pg.inner_text('#signout-note') == 'Signing out erases this app’s data from this phone.')
    pg.click('[data-act=privacy]'); pg.wait_for_timeout(100)
    check('privacy: page with every section', pg.inner_text('#screen-title') == 'Privacy & security'
          and all(pg.locator(f'#privacy-{s}').count() == 1 for s in ('where', 'who', 'never', 'phone', 'code', 'log'))
          and 'Sam' in pg.inner_text('#privacy-who') and 'nam5' in pg.inner_text('#privacy-where')
          and pg.evaluate("document.querySelector('a[href=\"#/settings\"]').getBoundingClientRect().top") < 40)
    tab(pg, 'home')
    fs_write(pg, 'config/profile-p1', {'theme': 'dark'})
    check('shell: profile theme dark', pg.evaluate("document.documentElement.classList.contains('dark')"))
    fs_write(pg, 'config/profile-p1', {'theme': 'system'})
    pg.emulate_media(color_scheme='dark'); pg.wait_for_timeout(100); on = pg.evaluate("document.documentElement.classList.contains('dark')")
    pg.emulate_media(color_scheme='light'); pg.wait_for_timeout(100)
    check('shell: system theme follows the phone', on and not pg.evaluate("document.documentElement.classList.contains('dark')"))
    fs_write(pg, 'config/profile-p1', {'color': 'aqua'})
    check('shell: person color variable', pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--person-a-l').trim()").lower() == '#1baf7a')
    logout(pg); pg.goto(URL + '#/history'); pg.wait_for_selector('#login-form')
    login_to(pg, 'a', '#screen-title')
    check('shell: deep link', pg.inner_text('#screen-title') == 'History')
    c.close()
    # Review Focus 2: sign out erases the device copy even with persistence on
    c = new_ctx(b); pg = open_app(c); pg.evaluate("sessionStorage.setItem('__persist', '1')"); login(pg)
    fs_write(pg, 'expenses/x1', {'amountCents': 500, 'payer': 'p2', 'merchant': 'Costco', 'category': 'Groceries', 'date': '2026-10-01',
                                  'split': 'half', 'settled': False, 'createdBy': 'p2', 'createdAt': 1})
    pg.evaluate("localStorage.setItem('venmoPending', '{}')")
    tab(pg, 'settings'); sign_out_button(pg); pg.wait_for_timeout(200)
    check('session: sign out erases the device copy', pg.evaluate("sessionStorage.getItem('__store')") is None
          and pg.evaluate("localStorage.getItem('venmoPending')") is None)
    c.close()
    c = new_ctx(b); pg = open_app(c); login(pg, 'b_messy')
    check('shell: second member signs in (messy email)', 'Sam' in pg.inner_text('#screen-title'))
    c.close()
    # A phone opening a home-network preview over plain http has no crypto.subtle; members must still get in.
    c = new_ctx(b); c.add_init_script("Object.defineProperty(Crypto.prototype, 'subtle', { get: () => undefined })")
    pg = open_app(c); login(pg)
    check('shell: member signs in without crypto.subtle (http preview)', pg.evaluate('crypto.subtle') is None
          and 'Alex' in pg.inner_text('#screen-title'))
    c.close()
