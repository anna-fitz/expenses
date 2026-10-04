# Shared expenses

A small, private web app for two people to log shared expenses, see who owes whom, and settle up. It works on phones as a home-screen app, including offline.

**Live app:** https://anna-fitz.github.io/expenses/

Only the two accounts listed in the database's security rules can sign in and see data. The code in this repository contains no personal data.

## How it works

- Type an amount, pick the store, and save. Everything is split 50/50 unless marked otherwise.
- The balance covers everything since the last settle-up. Settling up records the payment and starts a fresh balance.
- Regular bills are one-tap buttons, with a warning when a bill is unusually high.
- Each person has a profile (emoji, color, light or dark theme), and History keeps a log of every change.
- Stores and bills can be renamed, merged, retired, or brought back from Profile → Shared lists, and the app asks before saving a likely duplicate.
- Settle up with a Venmo link (amount and note filled in), and a shared reminder shows when it's been a while or the balance is high.
- Built to meet WCAG 2.2 Level A accessibility.

## What's in this repository

| File | What it does |
|---|---|
| `index.html` | The page and all the styling |
| `app.js` | The screens and the app's logic |
| `copy.js` | Every word the app shows, plus money and date formatting. Edit the voice here. |
| `stores.js` | Store names: aliases after a rename or merge, and the store lists |
| `ui.js` | Accessibility helpers: screens, focus, announcements, the undo message |
| `sw.js` | Offline support (saves the app on the phone) |
| `manifest.webmanifest` | Name, colors, and icons for the home-screen app |
| `icons/` | App icons |
| `test/` | Automated tests, including an accessibility scan (sign-in emails stay in an untracked file) |

## Built with

- Plain HTML, CSS, and JavaScript, with no build step
- [Firebase](https://firebase.google.com/) for sign-in and the database (free Spark plan)
- [GitHub Pages](https://pages.github.com/) for hosting

It costs nothing to run and doesn't use any paid services.

## Updating the app

1. Change the files and run the tests: `python test/run.py`. They need `pip install playwright axe-playwright-python`, `python -m playwright install chromium`, and a local `test/accounts.local.json` with the two sign-in emails.
2. If you changed any of the files above, raise the version number in the `CACHE` line of `sw.js` so phones download the update.
3. Commit and push to `main`. GitHub Pages republishes in about a minute.

The database security rules aren't in this repository because they contain sign-in email addresses. If an update changes them, publish the new rules in Firebase before pushing the app.
