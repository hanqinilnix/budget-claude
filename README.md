# Spendings

A small offline-first spending tracker: log what you spend, then see it by day, week, month or year, stepping back through any past period. Built as a PWA so it installs on your phone's home screen and works without a network connection. Tuned for iPhone 13 (390×844) but works on any screen.

All data (spending, trips, categories, currency) is stored locally in the browser via **IndexedDB** — your spending is never sent anywhere. The only network use is looking up exchange rates for trips, which sends just the two currency codes and a date to a free public rates file. Use Settings → Export to back up your data as a JSON file.

## How it's organised

- **Spending** is the main view of everything you've spent: Day, 7 Days, Week, Month and Year, with a comparison against the period before.
- **History** is the full list of entries, month by month. An entry is either a single amount or a receipt, which lists items with prices and can hold a photo. Only a receipt's total counts towards spending and shows in lists. The app stores its own compressed copy of the photo, because a web app can't keep a lasting link to a file in the phone's photo library.
- **Trips** are travel journals. Starting one puts the app into that journal in its pre-trip stage, the first day can be in the future, and any number can be planned at once. Once a trip's first day arrives, the app opens on the journal every launch until you end the trip. A switch at the top goes back to the main view at any time. Trip spending also counts in the main view, where each trip shows as a single row. Each trip page splits into Pre-trip, Trip and Post-trip, and every entry records which one it belongs to. Trips have their own categories, separate from everyday ones. A trip can have its own currency, with each day's exchange rate looked up online to convert that day's entries to your home currency, and a finished trip shows the average rate it worked out at. Entries logged offline aren't counted in main totals until their rate can be fetched.

What other trackers offer, and how this one compares, is in [`docs/spending-tracker-research.md`](docs/spending-tracker-research.md).

## Stack

- React 19 + Vite (JavaScript, no TypeScript)
- `idb` — small IndexedDB wrapper for local storage
- `vite-plugin-pwa` — installable PWA, offline caching via a generated service worker
- No CSS framework — hand-written, mobile-first CSS with light/dark theme support

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

## Data & backup

Everything lives in IndexedDB in your browser, scoped to the deployed site's origin. That means:

- Clearing Safari/Chrome site data, or reinstalling the PWA under a different URL, will lose your data.
- Use **Settings → Export a backup** to download a JSON backup, and **Import a backup** to restore it (e.g. after moving to a new phone). Restoring replaces everything in the app.
- Use **Settings → Import a spreadsheet** to add entries from a CSV with `date`, `category` and `amount` columns, and optionally `remarks`. It keeps existing data, creates any missing categories, and skips rows already saved.

The database and currency setting keep their original `budget-` names so that data saved before the rename carries over.
