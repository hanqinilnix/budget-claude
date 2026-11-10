import { daysBetweenISO, roundRate, todayISO } from './utils.js';

// A free daily-rates dataset with no API key, published as one file per date.
// The same data sits on two hosts, so one being down doesn't matter.
function urlsFor(version, base) {
  return [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${base}.min.json`,
    `https://${version}.currency-api.pages.dev/v1/currencies/${base}.min.json`,
  ];
}

async function readRate(version, base, quote) {
  for (const url of urlsFor(version, base)) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const rate = (await response.json())[base]?.[quote];
      if (rate > 0) return rate;
    } catch {
      // Offline or blocked: fall through to the next host.
    }
  }
  return null;
}

const found = new Map();

// How much foreign currency 1 home currency bought on a date, or null if it
// can't be reached right now. Only the two currency codes and the date are
// ever sent, never anything about the spending.
export async function fetchDailyRate(home, foreign, date) {
  const key = `${home}-${foreign}-${date}`;
  if (found.has(key)) return found.get(key);

  const base = home.toLowerCase();
  const quote = foreign.toLowerCase();
  let rate = await readRate(date, base, quote);
  // Each date's file appears partway through the UTC day, so today's may not
  // exist yet, especially in time zones ahead of UTC.
  if (!rate && daysBetweenISO(date, todayISO()) <= 1) rate = await readRate('latest', base, quote);
  if (!rate) return null;

  const rounded = roundRate(rate);
  found.set(key, rounded);
  return rounded;
}
