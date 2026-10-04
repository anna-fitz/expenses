from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'settings'); pg.click('[data-act=profile]'); pg.wait_for_timeout(200)
    check('profile: you, as the title', pg.inner_text('#screen-title') == 'Alex' and pg.title() == 'Profile · Expenses'
          and pg.evaluate('location.hash') == '#/settings/profile' and pg.evaluate('document.activeElement.id') == 'screen-title')
    check('profile: three sections', [pg.inner_text(f'#{h}') for h in ('h-look', 'h-paid', 'h-account')] == ['Your look', 'Getting paid', 'Account'])
    # Emoji
    pg.fill('#p-emoji', '👩🏽‍💻'); pg.click('[data-act=emoji-save]'); pg.wait_for_timeout(150)
    check('profile: any single emoji saves', st(pg)['config/profile-p1'].get('emoji') == '👩🏽‍💻' and 'Emoji saved.' in toast_text(pg))
    for bad in ('🐶🐱', 'ab'):
        pg.fill('#p-emoji', bad); pg.click('[data-act=emoji-save]'); pg.wait_for_timeout(100)
        check(f'profile: two emoji or text are refused ({len(bad)} chars)', pg.inner_text('#p-emoji-err') == 'Use one emoji.'
              and pg.get_attribute('#p-emoji', 'aria-invalid') == 'true' and 'p-emoji-err' in pg.get_attribute('#p-emoji', 'aria-describedby')
              and pg.evaluate('document.activeElement.id') == 'p-emoji' and st(pg)['config/profile-p1'].get('emoji') == '👩🏽‍💻')
    tab(pg, 'home')
    check('profile: the new emoji shows on Home', '👩🏽‍💻' in pg.inner_text('.legend'))
    tab(pg, 'settings'); pg.click('[data-act=profile]'); pg.wait_for_timeout(150)
    pg.click('[data-act=emoji-clear]'); pg.wait_for_timeout(150)
    check('profile: Use my initial instead clears it', st(pg)['config/profile-p1'].get('emoji') is None and 'Emoji removed.' in toast_text(pg)
          and pg.locator('[data-act=emoji-clear]').count() == 0)
    # Color
    disabled = pg.evaluate("[...document.querySelectorAll('input[name=p-color]:disabled')].map(i => i.value)")
    check('profile: colors near Sam’s are disabled, with a reason', disabled == ['orange', 'aqua', 'green']
          and 'Sam’s color' in pg.inner_text('label:has(input[value=green])') and 'Too close to Sam’s' in pg.inner_text('label:has(input[value=aqua])')
          and checked(pg, 'p-color') == 'violet')
    pg.check('input[name=p-color][value=blue]'); pg.wait_for_timeout(150)
    check('profile: a tap saves the color', st(pg)['config/profile-p1'].get('color') == 'blue' and 'Color saved.' in toast_text(pg)
          and pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--person-a-l').trim()").lower() == '#2a78d6')
    fs_write(pg, 'config/profile-p2', {'color': 'blue', 'updatedAt': 1})
    pg.wait_for_timeout(150)
    fs_write(pg, 'config/profile-p1', {'updatedAt': 9_999_999_999_999})
    check('profile: when both saved clashing colors, it says so', pg.inner_text('#p-color-moved') == 'Sam picked this color too, so yours shows as Orange for now.')
    fs_write(pg, 'config/profile-p2', {'color': 'green'}); fs_write(pg, 'config/profile-p1', {'color': 'plum'})
    check('profile: an older color key shows as its new color', checked(pg, 'p-color') == 'violet')
    # Theme
    pg.check('input[name=p-theme][value=dark]'); pg.wait_for_timeout(150)
    check('profile: the theme saves and applies at once', st(pg)['config/profile-p1'].get('theme') == 'dark' and 'Theme saved.' in toast_text(pg)
          and pg.evaluate("document.documentElement.classList.contains('dark')"))
    pg.check('input[name=p-theme][value=light]'); pg.wait_for_timeout(100)
    # Venmo
    check('profile: the Venmo note explains the mechanism', pg.inner_text('#p-venmo-note code') == 'venmo.com/{username}?txn=pay&amount=…&note=…'
          and 'never signs in to Venmo' in pg.inner_text('#p-venmo-note') and 'readable only by your account and Sam’s' in pg.inner_text('#p-venmo-note'))
    pg.fill('#p-venmo', ' @alex_pays '); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(150)
    check('profile: Venmo saves without the @', st(pg)['config/profile-p1'].get('venmo') == 'alex_pays' and 'Venmo username saved.' in toast_text(pg)
          and pg.input_value('#p-venmo') == 'alex_pays')
    pg.fill('#p-venmo', 'ab'); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(100)
    check('profile: a bad username is refused', pg.inner_text('#p-venmo-err') == 'Use 5–30 letters, numbers, dashes, or underscores'
          and pg.get_attribute('#p-venmo', 'aria-invalid') == 'true' and pg.evaluate('document.activeElement.id') == 'p-venmo')
    pg.fill('#p-venmo', ''); pg.click('[data-act=venmo-save]'); pg.wait_for_timeout(150)
    check('profile: empty removes it', st(pg)['config/profile-p1'].get('venmo') is None and 'Venmo username removed.' in toast_text(pg))
    # Account
    check('profile: your email, only here', pg.inner_text('#p-email') == ACC['a'] and 'Used only to sign in. Admins can see it in the Firebase console.' in pg.inner_text('main'))
    pg.click('[data-act=change-pw]'); pg.wait_for_selector('#layer-title'); pg.wait_for_timeout(250)
    check('password: a sheet, without a skip', pg.inner_text('#layer-title') == 'Change password' and pg.evaluate('location.hash') == '#/settings/profile/password'
          and pg.locator('[data-act=pw-skip]').count() == 0)
    pg.fill('#pw-new', 'correct-horse-battery'); pg.fill('#pw-confirm', 'correct-horse-battery'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(250)
    check('password: saved, and the sheet closes', pg.evaluate('window.__newPassword') == 'correct-horse-battery' and not sheet_open(pg)
          and 'Password saved.' in toast_text(pg) and pg.evaluate('location.hash') == '#/settings/profile')
    pg.evaluate('window.__needRecent = true; window.__reauthed = false; window.__newPassword = null')
    pg.click('[data-act=change-pw]'); pg.wait_for_selector('#pw-new'); pg.wait_for_timeout(250)
    pg.fill('#pw-new', 'another-long-password'); pg.fill('#pw-confirm', 'another-long-password'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(200)
    check('password: Firebase asks for the current password, no dead end', pg.locator('#pw-current').count() == 1 and sheet_open(pg))
    pg.fill('#pw-current', 'correct-horse'); pg.click('[data-act=pw-save]'); pg.wait_for_timeout(250)
    check('password: …and it finishes', pg.evaluate('window.__reauthed') is True and pg.evaluate('window.__newPassword') == 'another-long-password' and not sheet_open(pg))
    pg.evaluate('window.__needRecent = false')
    pg.click('[data-act=change-pw]'); pg.wait_for_selector('#pw-new'); close_sheet(pg)
    check('password: Escape closes it', not sheet_open(pg) and pg.evaluate('location.hash') == '#/settings/profile')
    pg.click('[data-act=back-settings]'); pg.wait_for_timeout(150)
    pg.click('[data-act=privacy]'); pg.wait_for_timeout(150)
    check('privacy: the Venmo point explains the link too', 'only builds a link (venmo.com/{username}?txn=pay&amount=…)' in pg.inner_text('#privacy-never'))
    c.close()
