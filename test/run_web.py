import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.argv = [sys.argv[0], os.path.join(HERE, '..', 'web', 'dist-test')]   # harness serves this build
sys.path.insert(0, HERE)
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from harness import R, ERRS, check, start_server, launch
import suite_web_shell, suite_web_onboarding, suite_web_home, suite_web_add, suite_web_dupes, suite_web_edit, suite_web_history, suite_web_settle, suite_web_settings, suite_web_axe

SUITES = [suite_web_shell, suite_web_onboarding, suite_web_home, suite_web_add, suite_web_dupes, suite_web_edit, suite_web_history, suite_web_settle, suite_web_settings, suite_web_axe]
srv = start_server(); time.sleep(1)
try:
    with sync_playwright() as p:
        b = launch(p)
        for s in SUITES:
            try: s.run(b)
            except Exception as e: check(f'{s.__name__} crashed: {e!r}', False)
        b.close()
finally:
    srv.terminate()
check('no page errors', not ERRS)
if ERRS: print('errors', ERRS)
for n, ok in R: print('PASS' if ok else 'FAIL', n)
print(f"{sum(ok for _, ok in R)}/{len(R)} passed")
sys.exit(0 if all(ok for _, ok in R) else 1)
