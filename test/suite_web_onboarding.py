from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c, onboarded=False)
    login_to(pg, 'a', '#onboarding')
    check('onboarding: privacy step first', pg.inner_text('#screen-title') == 'Before you start: how your data is protected'
          and pg.evaluate('document.activeElement.id') == 'screen-title' and pg.locator('#ob-points > li').count() == 5
          and 'Sam' in pg.inner_text('#ob-points'))
    pg.click('#onboarding summary'); pg.wait_for_timeout(50)
    check('onboarding: full details expand', pg.locator('#onboarding #privacy-log').is_visible())
    pg.click('[data-act=ob-continue]'); pg.wait_for_timeout(100)
    check('onboarding: password step', pg.inner_text('#screen-title') == 'Set your own password'
          and 'Nobody can read it, including Sam.' in pg.inner_text('#onboarding'))
    pg.fill('#pw-new', 'short'); pg.fill('#pw-confirm', 'short'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(50)
    check('onboarding: too short', pg.inner_text('#pw-err') == 'Use at least 12 characters.'
          and pg.get_attribute('#pw-new', 'aria-invalid') == 'true' and pg.evaluate('document.activeElement.id') == 'pw-new')
    pg.fill('#pw-new', 'a-long-new-pass-1'); pg.fill('#pw-confirm', 'a-long-new-pass-2'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(50)
    check('onboarding: mismatch', pg.inner_text('#pw-err') == 'The two passwords don’t match.' and pg.evaluate('document.activeElement.id') == 'pw-confirm')
    pg.click('#pw-show')
    check('onboarding: show passwords', pg.get_attribute('#pw-new', 'type') == 'text')
    # Review Focus 3: Firebase wants a recent sign-in
    pg.evaluate('window.__needRecent = true')
    pg.fill('#pw-confirm', 'a-long-new-pass-1'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(150)
    check('onboarding: recent sign-in required', pg.is_visible('#pw-current')
          and 'For your security, enter your current password to continue.' in pg.inner_text('#onboarding'))
    pg.fill('#pw-current', 'nope'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(150)
    check('onboarding: wrong current password', pg.inner_text('#pw-err') == 'That current password isn’t right.' and pg.evaluate('document.activeElement.id') == 'pw-current')
    pg.fill('#pw-current', 'correct-horse'); pg.click('[data-act=pw-save]'); pg.wait_for_selector('.hero'); pg.wait_for_timeout(150)
    check('onboarding: saved and done', pg.evaluate('window.__newPassword') == 'a-long-new-pass-1'
          and st(pg)['config/profile-p1'].get('onboarded') is True)
    logout(pg); login(pg)
    check('onboarding: not shown again', pg.locator('#onboarding').count() == 0)
    c.close()
    c = new_ctx(b); pg = open_app(c, onboarded=False); login_to(pg, 'b', '#onboarding')
    pg.click('[data-act=ob-continue]'); pg.click('[data-act=pw-skip]'); pg.wait_for_selector('.hero')
    check('onboarding: skip password', st(pg)['config/profile-p2'].get('onboarded') is True and pg.evaluate('window.__newPassword') is None)
    c.close()
