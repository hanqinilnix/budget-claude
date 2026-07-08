# Budget

A small offline-first budget tracker: log income/expenses, set a monthly budget per category, and see spent-vs-budget progress at a glance. Built as a PWA so it installs on your phone's home screen and works without a network connection. Tuned for iPhone 13 (390×844) but works on any screen.

All data (transactions, categories, currency) is stored locally in the browser via **IndexedDB** — nothing is sent to a server. Use Settings → Export to back up your data as a JSON file.

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
- Use **Settings → Export data** to download a JSON backup, and **Import data** to restore it (e.g. after moving to a new phone).
