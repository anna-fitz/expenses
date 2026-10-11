# Switching to the new app

The new app replaces the old one at the same address, https://anna-fitz.github.io/expenses/. It reads and writes the same Firebase data, so nothing needs moving, and the Home Screen icon on each phone keeps working. The old app's files stay in the repository, so going back is one setting.

## 1. Before you switch

- [ ] **Push the branch and merge it.** Push `claude/project-thread-phs9r8` from GitHub Desktop, open a pull request into `main`, and look it over. Don't merge it yet.
- [ ] **Run the browser tests once.** `cd test && python run_web.py`. They need Python, `pip install playwright axe-playwright-python`, `python -m playwright install chromium`, and `test/accounts.local.json`. They have not been run against the latest changes, because the Mac used to build them has no Python.
- [ ] **Publish the edit rule in Firebase** (see below). Without it the app stops each of you from changing the other's expenses, but the database would still allow it.
- [ ] **Try it on both phones** on the dev server (`http://192.168.1.137:4173` while it's running), signed in as yourselves:
  - [ ] Each of you adds an expense, and it appears on the other phone within a few seconds.
  - [ ] Add a bill from **Pick a bill**. It shows a Bill badge on Home and fills its pill in Insights.
  - [ ] Tap the other person's expense. It opens read-only and shows what you owe. Tap your own, and it opens Edit.
  - [ ] Edit something of yours, then check History → Activity reads in plain words.
  - [ ] Open Settle up. Check the amount and the Venmo button, but don't record a settle-up unless you mean it.
  - [ ] Turn on airplane mode, add an expense, turn it off, and check it syncs to the other phone.
  - [ ] Flip through Insights: this month, a spreadsheet month, the Year view.
- [ ] **Settle up first (optional).** Not required, since the balance carries over, but it makes a clean start easy to check.

## 2. Switch

1. **Merge the pull request** into `main`.
2. In GitHub, open the repository's **Settings → Pages**, and set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy web app**. If it didn't start on the merge, choose **Run workflow** on `main`. Wait for it to turn green, which takes a couple of minutes.
4. Open the app on each phone from the Home Screen icon. The first open may still show the old app. Close it fully and open it again, and the new one appears. If it doesn't, open the address in the browser once.

## 3. If something's wrong

Set **Settings → Pages → Source** back to **Deploy from a branch**, with `main` and `/ (root)`. The old app comes back within a minute or two, still on the same data. Anything logged in the new app shows up there too.

## 4. Afterwards

- In Google Cloud → Credentials, remove the `localhost` and `192.168.1.137` entries you added to the API key for testing. Keep the GitHub Pages one.
- Once you're happy, the old app's files at the repository root (`index.html`, `app.js`, `copy.js`, `stores.js`, `ui.js`, `sw.js`) can be deleted, along with the `test/suite_*.py` files that aren't `suite_web_*`.

## The edit rule for Firebase

In Firebase → Firestore → **Rules**, inside your existing `match /expenses/{id}` block, change the `update` and `delete` lines to this. `myId()` turns the signed-in email into your person id. Put your real emails in it, and use the same ids as Settings shows (the ones in `config/people`).

```
function myId() {
  return {'YOUR-EMAIL': 'YOUR-ID', 'KYLES-EMAIL': 'KYLES-ID'}[request.auth.token.email];
}
// Whoever logged it; older expenses without createdBy belong to the payer.
function ownerOf(d) { return d.get('createdBy', d.payer); }

allow create: if isMember() && request.resource.data.createdBy == myId();
// Only the person who logged it can change it. Either of you can mark it settled.
allow update: if isMember() && (ownerOf(resource.data) == myId()
  || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['settled', 'settlementId']));
allow delete: if isMember() && ownerOf(resource.data) == myId();
```

`isMember()` stands for whatever your rules already use to check that one of you is signed in. Use the **Rules playground** to check two things: an update to the other person's expense is denied, and an update that only sets `settled` is allowed.
