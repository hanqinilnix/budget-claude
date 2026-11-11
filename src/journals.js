import { daysBetweenISO } from './utils.js';

// Paid in a trip's currency, on a day that has no exchange rate yet.
export function isUnconverted(t) {
  return t.foreignAmount != null && t.amount === 0;
}

// The most recent day before this one with a rate, to save retyping it.
export function latestRateBefore(journal, date) {
  const rates = journal?.dailyRates ?? {};
  const previous = Object.keys(rates).filter((d) => d < date).sort().pop();
  return previous ? { date: previous, rate: rates[previous] } : null;
}

// Where a trip has got to as of a date.
export function stageOf(journal, today) {
  if (journal.endDate) return 'post';
  return today < journal.startDate ? 'pre' : 'trip';
}

// An entry says which part of the trip it belongs to, because a date alone
// can't: a taxi home on the last day and lunch that same day are both that
// date. Entries saved before this fall back to their date.
export function phaseOf(journal, t) {
  if (t.phase) return t.phase;
  if (t.date < journal.startDate) return 'pre';
  if (journal.endDate && t.date > journal.endDate) return 'post';
  return 'trip';
}

const sum = (entries, field) => entries.reduce((total, t) => total + (t[field] ?? 0), 0);

function summarizePhase(entries) {
  return {
    entries,
    total: sum(entries, 'amount'),
    foreignTotal: sum(entries, 'foreignAmount'),
    homePaid: sum(entries.filter((t) => t.foreignAmount == null), 'amount'),
    unconverted: entries.some(isUnconverted),
  };
}

export function summarizeJournal(journal, transactions, today) {
  const entries = transactions.filter((t) => t.journalId === journal.id && t.type === 'expense');
  // A trip that hasn't begun yet counts as its first day.
  const end = journal.endDate ?? (today < journal.startDate ? journal.startDate : today);
  const days = daysBetweenISO(journal.startDate, end) + 1;

  const inPhase = (key) => summarizePhase(entries.filter((t) => phaseOf(journal, t) === key));
  const tripPhase = inPhase('trip');

  const missing = entries.filter(isUnconverted);
  const converted = entries.filter((t) => t.foreignAmount != null && !isUnconverted(t));
  const convertedHome = sum(converted, 'amount');

  return {
    entries,
    end,
    days,
    total: sum(entries, 'amount'),
    foreignTotal: sum(entries, 'foreignAmount'),
    uncountedForeign: sum(missing, 'foreignAmount'),
    unconverted: missing.length > 0,
    missingDates: [...new Set(missing.map((t) => t.date))].sort(),
    // What the whole trip actually worked out at: every yen paid over every
    // dollar it cost, so bigger spending days count for more.
    averageRate: convertedHome > 0 ? sum(converted, 'foreignAmount') / convertedHome : null,
    phases: {
      pre: inPhase('pre'),
      trip: { ...tripPhase, perDay: tripPhase.total / days, foreignPerDay: tripPhase.foreignTotal / days },
      post: inPhase('post'),
    },
  };
}
