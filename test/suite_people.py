from harness import *
import hashlib

def run(b):
    c = new_ctx(b); pg = open_app(c); login(pg); pg.wait_for_timeout(200)
    p = st(pg).get('config/people', {}).get('members', {})
    h = lambda e: hashlib.sha256(e.strip().lower().encode()).hexdigest()
    check('people: record written on sign-in', len(p) == 2 and h(ACC['bre']) in p and h(ACC['kyle']) in p)
    check('people: entries have id and name', all(set(v) == {'id', 'name'} for v in p.values())
          and sorted(v['id'] for v in p.values()) == sorted(NAMES))
    fs_write(pg, 'config/people', {'members': {h(ACC['bre']): {'id': 'bre', 'name': 'Renamed'}}})
    logout(pg); login(pg); pg.wait_for_timeout(200)
    check('people: never overwrites an existing record', st(pg)['config/people']['members'][h(ACC['bre'])]['name'] == 'Renamed')
    c.close()
