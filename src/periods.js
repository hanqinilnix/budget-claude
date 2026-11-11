import {
  addDaysISO,
  endOfMonthISO,
  formatDayRange,
  formatMonthName,
  formatWeekdayDayMonth,
  shiftMonthsISO,
  startOfMonthISO,
  startOfWeekISO,
} from './utils.js';

export const PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'rolling', label: '7 Days' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

// The stretch of time a period covers around an anchor date.
export function getRange(period, anchor) {
  if (period === 'day') return { start: anchor, end: anchor };
  if (period === 'rolling') return { start: addDaysISO(anchor, -6), end: anchor };
  if (period === 'week') {
    const start = startOfWeekISO(anchor);
    return { start, end: addDaysISO(start, 6) };
  }
  if (period === 'year') {
    const year = anchor.slice(0, 4);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: startOfMonthISO(anchor), end: endOfMonthISO(anchor) };
}

export function shiftAnchor(period, anchor, delta) {
  if (period === 'day') return addDaysISO(anchor, delta);
  if (period === 'rolling' || period === 'week') return addDaysISO(anchor, delta * 7);
  return shiftMonthsISO(anchor, period === 'year' ? delta * 12 : delta);
}

export function containsDate({ start, end }, date) {
  return start <= date && date <= end;
}

export function getRangeLabel(period, range, today) {
  const { start, end } = range;
  if (period === 'day') {
    if (start === today) return `Today, ${formatWeekdayDayMonth(start, today)}`;
    if (start === addDaysISO(today, -1)) return `Yesterday, ${formatWeekdayDayMonth(start, today)}`;
    return formatWeekdayDayMonth(start, today);
  }
  if (period === 'month') return formatMonthName(start.slice(0, 7));
  if (period === 'year') return start.slice(0, 4);
  const dates = formatDayRange(start, end, today);
  if (period === 'week' && containsDate(range, today)) return `This week, ${dates}`;
  if (period === 'rolling' && end === today) return `Last 7 days, ${dates}`;
  return dates;
}

const PREVIOUS_WORDS = {
  day: { current: 'yesterday', past: 'the day before' },
  rolling: { current: 'the 7 days before', past: 'the 7 days before' },
  week: { current: 'last week', past: 'the week before', partial: 'this point last week' },
  month: { current: 'last month', past: 'the month before', partial: 'this point last month' },
  year: { current: 'last year', past: 'the year before', partial: 'this point last year' },
};

// What to compare a period with. A period still under way is measured against
// the same point in the one before, so the 9th is never set against a whole month.
export function getComparison(period, range, today) {
  const previous = getRange(period, shiftAnchor(period, range.end, -1));
  const isCurrent = containsDate(range, today);
  const words = PREVIOUS_WORDS[period];
  if (isCurrent && today < range.end) {
    return { start: previous.start, end: shiftAnchor(period, today, -1), words: words.partial };
  }
  return { ...previous, words: isCurrent ? words.current : words.past };
}
