import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from harness import R, ERRS, check, start_server, launch
import suite_core, suite_layers, suite_voice, suite_activity, suite_add

SUITES = [suite_core, suite_layers, suite_voice, suite_activity, suite_add]

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
