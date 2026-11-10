import {
  addDaysISO,
  daysBetweenISO,
  endOfMonthISO,
  formatDateShort,
  formatDateWeekday,
  formatDateWithYear,
  formatMonthLabel,
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
  const sameYear = start.slice(0, 4) === today.slice(0, 4);
  if (period === 'day') {
    return start === today ? `Today · ${formatDateShort(start)}` : formatDateWeekday(start, !sameYear);
  }
  if (period === 'month') return formatMonthLabel(start.slice(0, 7));
  if (period === 'year') return start.slice(0, 4);
  const format = sameYear ? formatDateShort : formatDateWithYear;
  const dates = `${format(start)} – ${format(end)}`;
  if (period === 'week' && containsDate(range, today)) return `This week · ${dates}`;
  if (period === 'rolling' && end === today) return `Last 7 days · ${dates}`;
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

export function dayBuckets(start, end, labelFor) {
  const count = daysBetweenISO(start, end) + 1;
  return Array.from({ length: count }, (_, index) => {
    const date = addDaysISO(start, index);
    return { key: date, start: date, end: date, title: formatDateWeekday(date), label: labelFor(date, index, count) };
  });
}

function narrowWeekday(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
}

const dayOfMonth = (date) => String(Number(date.slice(8)));

export function tripDayLabel(date, index, count) {
  return count <= 14 || index % 7 === 0 ? dayOfMonth(date) : '';
}

// The bars inside a period. A single day has none.
export function getBuckets(period, range) {
  const { start, end } = range;
  if (period === 'day') return [];
  if (period === 'year') {
    const year = start.slice(0, 4);
    return Array.from({ length: 12 }, (_, index) => {
      const monthStart = `${year}-${String(index + 1).padStart(2, '0')}-01`;
      return {
        key: monthStart,
        start: monthStart,
        end: endOfMonthISO(monthStart),
        title: formatMonthLabel(monthStart.slice(0, 7)),
        label: new Date(monthStart + 'T00:00:00').toLocaleDateString(undefined, { month: 'narrow' }),
      };
    });
  }
  if (period === 'month') {
    return dayBuckets(start, end, (date, index) => (index % 7 === 0 ? dayOfMonth(date) : ''));
  }
  return dayBuckets(start, end, narrowWeekday);
}

export function fillBuckets(buckets, expenses) {
  return buckets.map((bucket) => ({
    ...bucket,
    value: expenses.reduce((sum, t) => (containsDate(bucket, t.date) ? sum + t.amount : sum), 0),
  }));
}
