# Spendings

A small offline-first spending tracker: log what you spend, then see it by day, week, month or year, stepping back through any past period. Built as a PWA so it installs on your phone's home screen and works without a network connection. Tuned for iPhone 13 (390×844) but works on any screen.

All data (spending, trips, categories, currency) is stored locally in the browser via **IndexedDB** — your spending is never sent anywhere. The only network use is looking up exchange rates for trips, which sends just the two currency codes and a date to a free public rates file. Use Settings → Export to back up your data as a JSON file.

## How it's organised

- **Spending** shows a different page for each pace of spending. Every category has a pace, set in Settings: **Everyday** (small and frequent, such as food), **Every month** (bills, subscriptions, transport, money for family) or **Now and then** (large and rare, such as insurance, tax or a new computer). Day, 7 Days and Week lead with everyday spending, Month leads with a checklist of what comes round each month, and Year lists the large things one by one. Whatever a period doesn't lead with is still totalled and named in a single line, so nothing is hidden.
  - On **Month**, something counts as a fixed payment once the same category and note turned up in at least three of the four months before, about once a month and for about the same amount. Fixed payments get a tick when paid. A monthly category with no fixed payments, such as transport, fills a bar towards its usual month instead.
  - On **Year**, a trip is one line with its whole cost, and tapping it opens the trip.
- **History** is the full list of entries, month by month, with a total for each day. An entry is a single amount or a list of items with prices, which can also hold a receipt photo. The app stores its own compressed copy of the photo, because a web app can't keep a lasting link to a file in the phone's photo library.
- **Trips** are travel journals. Starting one plans it, and the first day can be in the future. Once a trip's first day arrives, the app opens on it every launch until you end it, and the Trips tab carries its name. A trip is one page with three chapters: before the trip, the trip's own days (newest first), and after the trip. Trip screens have a black top, everyday screens a butter one, so you can always tell which you're in. Trips have their own categories. A trip can have its own currency, with each day's exchange rate looked up online to convert that day's entries to your home currency. Entries logged offline aren't counted in home-currency totals until their rate can be fetched.
- **Adding an entry** starts with the amount, then one row of answers: the date, the currency, the part of the trip, and whether it's split into items. Each starts as the likeliest answer and turns honey once changed. Category tiles are ordered by how recently you used them.

The look is white, black and butter, set in Bricolage Grotesque, which is bundled so it works offline. The home-screen icons are drawn by `node scripts/draw-icons.mjs`.

What other trackers offer, and how this one compares, is in [`docs/spending-tracker-research.md`](docs/spending-tracker-research.md).

## Stack

- React 19 + Vite (JavaScript, no TypeScript)
- `idb` — small IndexedDB wrapper for local storage
- `vite-plugin-pwa` — installable PWA, offline caching via a generated service worker
- No CSS framework — hand-written, mobile-first CSS with light/dark theme support
- The grouping of spending by pace lives in plain functions in `src/lenses.js`, apart from the screens

## Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. For the most accurate feel, open Chrome/Safari DevTools device toolbar and pick "iPhone 13" (390×844).

## Build

```bash
npm run build
npm run preview
```

## Deploying to GitHub Pages

A workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys automatically on every push to `main`. To enable it on a new repo:

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages** and set **Source** to "GitHub Actions".
3. Push to `main` (or run the workflow manually from the Actions tab). The app will be published at `https://<your-username>.github.io/<repo-name>/`.

The build automatically picks up the correct base path from the repository name — no manual config needed.

## Installing on iPhone

Once deployed, open the site in Safari on your iPhone, tap the Share icon, then **Add to Home Screen**. It'll launch full-screen like a native app and keep working offline after the first load.

### Checking that the app fills the screen

Opening the app with `?fit` at the end of its address shows a readout of the measured app height, the browser's heights and the status-bar inset. It was added to confirm the fix for the app sometimes coming up short when launched from the home screen, and can be removed once that's confirmed on the phone (`src/components/FitReadout.jsx`).

## Data & backup

Everything lives in IndexedDB in your browser, scoped to the deployed site's origin. That means:

- Clearing Safari/Chrome site data, or reinstalling the PWA under a different URL, will lose your data.
- Use **Settings → Export a backup** to download a JSON backup, and **Import a backup** to restore it (e.g. after moving to a new phone). Restoring replaces everything in the app.
- Use **Settings → Import a spreadsheet** to add entries from a CSV with `date`, `category` and `amount` columns, and optionally `remarks`. It keeps existing data, creates any missing categories, and skips rows already saved.

The database and currency setting keep their original `budget-` names so that data saved before the rename carries over.
