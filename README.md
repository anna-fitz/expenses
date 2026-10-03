# Shared expenses

A small, private web app for two people to log shared expenses, see who owes whom, and settle up. It works on phones as a home-screen app, including offline.

**Live app:** https://anna-fitz.github.io/expenses/

Only the two accounts listed in the database's security rules can sign in and see data. The code in this repository contains no personal data.

## How it works

- Type an amount, tap a store, and it's saved. Everything is split 50/50 unless marked otherwise.
- The balance covers everything since the last settle-up. Settling up records the payment and starts a fresh balance.
- Regular bills are one-tap buttons, with a warning when a bill is unusually high.

## What's in this repository

| File | What it does |
|---|---|
| `index.html` | The page and all the styling |
| `app.js` | All of the app's logic |
| `sw.js` | Offline support (saves the app on the phone) |
| `manifest.webmanifest` | Name, colors, and icons for the home-screen app |
| `icons/` | App icons |

## Built with

- Plain HTML, CSS, and JavaScript, with no build step
- [Firebase](https://firebase.google.com/) for sign-in and the database (free Spark plan)
- [GitHub Pages](https://pages.github.com/) for hosting

It costs nothing to run and doesn't use any paid services.

## Updating the app

1. Change the files and run the tests (kept outside this repository).
2. If you changed any of the files above, raise the version number in the `CACHE` line of `sw.js` so phones download the update.
3. Commit and push to `main`. GitHub Pages republishes in about a minute.

The database security rules and the tests aren't in this repository because they contain sign-in email addresses.
