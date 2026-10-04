from web_harness import *

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg)
    tab(pg, 'settings')
    card = pg.inner_text('[data-act=profile]')
    check('settings: your profile card first', 'Alex' in card and 'Profile, Venmo, account' in card
          and pg.get_attribute('[data-act=profile]', 'href') == '#/settings/profile')
    check('settings: the Shared group', pg.inner_text('#shared-h') == 'Shared' and pg.inner_text('#shared-note') == 'Changes here apply to both of you.')
    check('settings: counts and the reminder summary', '17 stores' in pg.inner_text('[data-act=stores]') and '6 bills' in pg.inner_text('[data-act=bills]')
          and 'After 60 days or over $500' in pg.inner_text('[data-act=reminder]'))
    fs_write(pg, 'bills/gardener', {'active': False})
    check('settings: a retired bill isn’t counted', '5 bills' in pg.inner_text('[data-act=bills]'))
    check('settings: privacy and sign out stay', pg.locator('[data-act=privacy]').count() == 1 and pg.locator('[data-act=signout]').count() == 1
          and pg.inner_text('#signout-note') == 'Signing out erases this app’s data from this phone.')
    pg.click('[data-act=stores]'); pg.wait_for_timeout(150)
    check('settings: Stores is coming soon, with a way back', pg.inner_text('#screen-title') == 'Stores' and pg.evaluate('location.hash') == '#/settings/stores'
          and 'Coming soon' in pg.inner_text('main') and pg.evaluate('document.activeElement.id') == 'screen-title')
    pg.click('[data-act=back-settings]'); pg.wait_for_timeout(150)
    check('settings: the back link returns to Settings', pg.inner_text('#screen-title') == 'Settings' and pg.evaluate('location.hash') == '#/settings')
    pg.click('[data-act=bills]'); pg.wait_for_timeout(150); pg.go_back(); pg.wait_for_timeout(150)
    check('settings: the phone’s Back returns too', pg.inner_text('#screen-title') == 'Settings')
    # ---- The reminder ----
    pg.click('[data-act=reminder]'); pg.wait_for_timeout(150)
    check('reminder: the page and its two choices', pg.inner_text('#screen-title') == 'Settle-up reminder' and pg.evaluate('document.activeElement.id') == 'screen-title'
          and pg.inner_text('#r-days-set legend') == 'Remind us after' and pg.inner_text('#r-cents-set legend') == 'Or when the balance is over'
          and checked(pg, 'r-days') == '60' and checked(pg, 'r-cents') == '50000'
          and pg.evaluate("[...document.querySelectorAll('#r-cents-set label')].map(l => l.innerText.trim()).join()") == 'Off,$250,$500,$1,000'
          and 'This applies to both of you.' in pg.inner_text('main'))
    check('reminder: nothing to remind about yet', pg.inner_text('#r-preview') == 'No reminder right now.')
    fs_batch(pg, [exp_row('e1', 120000, 'p2')])
    check('reminder: a big balance shows in the preview', pg.inner_text('#r-preview') == 'With these settings, the reminder is showing now.')
    pg.check('input[name=r-cents][value="0"]'); pg.wait_for_timeout(150)
    s = st(pg).get('config/settings', {})
    check('reminder: a tap saves for both of you', s.get('nudgeCents') == 0 and s.get('updatedBy') == 'p1' and 'Reminder saved.' in toast_text(pg))
    pg.check('input[name=r-days][value="0"]'); pg.wait_for_timeout(150)
    check('reminder: Off and Off never reminds', pg.inner_text('#r-preview') == 'No reminder right now.' and st(pg)['config/settings'].get('nudgeDays') == 0)
    fs_write(pg, 'config/settings', {'nudgeDays': 30})
    check('reminder: a change from the other phone shows here', checked(pg, 'r-days') == '30')
    pg.click('[data-act=back-settings]'); pg.wait_for_timeout(150)
    check('reminder: Settings shows the new summary', 'After 30 days' in pg.inner_text('[data-act=reminder]'))
    fs_write(pg, 'config/settings', {'nudgeDays': 0})
    check('reminder: both off reads Off', pg.inner_text('[data-act=reminder] .text-caption') == 'Off')
    c.close()
