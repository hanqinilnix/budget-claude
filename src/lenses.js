// How each period looks at spending. Every entry has a pace, from its
// category, and a period leads with the pace it suits: everyday spending on
// Day, 7 Days and Week, monthly spending on Month, and now-and-then spending
// on Year. Nothing is dropped. What a period doesn't lead with is totalled and
// named, so it can be shown in a single line. Plain functions, kept away from
// the screen, because this is the logic most likely to be subtly wrong.
import { paceOf } from './pace.js';
import { addDaysISO, daysBetweenISO, shiftMonthKey } from './utils.js';

export const sumOf = (entries) => entries.reduce((total, t) => total + t.amount, 0);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Notes are often typed in lower case. Those get a capital letter for
// showing as a name, and anything typed with capitals is left as it was.
export function asName(text) {
  const trimmed = (text ?? '').trim();
  if (!trimmed || trimmed !== trimmed.toLowerCase()) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

// A trip is one large thing, whatever its entries were spent on.
export function paceOfEntry(t, categoryById) {
  if (t.journalId != null) return 'occasional';
  return paceOf(categoryById.get(t.categoryId));
}

export function splitByPace(entries, categoryById) {
  const split = { everyday: [], monthly: [], occasional: [] };
  for (const t of entries) split[paceOfEntry(t, categoryById)].push(t);
  return {
    everyday: { entries: split.everyday, total: sumOf(split.everyday) },
    monthly: { entries: split.monthly, total: sumOf(split.monthly) },
    occasional: { entries: split.occasional, total: sumOf(split.occasional) },
    total: sumOf(entries),
  };
}

// What some entries went on, largest first: a trip by its name, anything
// else by its category.
export function nameWhatWent(entries, categoryById, journalById) {
  const totals = new Map();
  for (const t of entries) {
    const name = t.journalId != null
      ? (journalById.get(t.journalId)?.name ?? 'A trip')
      : (categoryById.get(t.categoryId)?.name ?? 'Uncategorized');
    totals.set(name, (totals.get(name) ?? 0) + t.amount);
  }
  return [...totals.entries()].filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

// Everyday categories that hold a large share of everyday entries, such as
// food, get a line of their own. The rest share one line.
const OWN_LINE_SHARE = 0.3;

export function ownLineCategoryIds(expenses, categoryById) {
  const counts = new Map();
  let all = 0;
  for (const t of expenses) {
    if (paceOfEntry(t, categoryById) !== 'everyday') continue;
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    all++;
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= all * OWN_LINE_SHARE)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

const UNKNOWN = { name: 'Uncategorized', icon: '❔' };

// Everyday entries as lines: one for each category with its own line, then
// one shared line that breaks down by category.
export function everydayLines(entries, ownLineIds, categoryById) {
  const lines = ownLineIds.map((id) => {
    const category = categoryById.get(id) ?? UNKNOWN;
    const own = entries.filter((t) => t.categoryId === id);
    return { key: String(id), label: category.name, icon: category.icon, entries: own, total: sumOf(own), parts: null };
  });
  const restEntries = entries.filter((t) => !ownLineIds.includes(t.categoryId));
  const parts = new Map();
  for (const t of restEntries) {
    const part = parts.get(t.categoryId) ?? { category: categoryById.get(t.categoryId) ?? UNKNOWN, total: 0, count: 0 };
    part.total += t.amount;
    part.count++;
    parts.set(t.categoryId, part);
  }
  lines.push({
    key: 'rest',
    label: ownLineIds.length > 0 ? 'Shopping and fun' : 'Everyday',
    icon: '🛍️',
    entries: restEntries,
    total: sumOf(restEntries),
    parts: [...parts.values()].sort((a, b) => b.total - a.total),
  });
  return lines;
}

export function dailyTotals(entries, start, end) {
  const byDate = new Map();
  for (const t of entries) byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
  const count = daysBetweenISO(start, end) + 1;
  return Array.from({ length: count }, (_, i) => {
    const date = addDaysISO(start, i);
    return { date, total: byDate.get(date) ?? 0 };
  });
}

// What a usual day of the same weekday costs: the average over the eight
// before it, counting only weeks since spending was first recorded.
export function usualForWeekday(everydayEntries, date, firstDate) {
  const byDate = new Map();
  for (const t of everydayEntries) byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
  const days = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => addDaysISO(date, -7 * k)).filter((d) => firstDate && d >= firstDate);
  if (days.length < 3) return null;
  return days.reduce((total, d) => total + (byDate.get(d) ?? 0), 0) / days.length;
}

const itemKey = (t) => `${t.categoryId}|${(t.note ?? '').trim().toLowerCase()}`;
const monthOf = (date) => date.slice(0, 7);

// The month's monthly spending, as a checklist. Something counts as a fixed
// payment once the same category and note turned up in at least three of the
// four months before, about once a month and for about the same amount. Those
// get a tick. A monthly category with no fixed payments, such as transport,
// varies too much for a tick, so it fills a bar towards its usual month.
export function monthlyChecklist(expenses, monthStart, categoryById, firstDate) {
  const month = monthOf(monthStart);
  const monthly = expenses.filter((t) => t.journalId == null && paceOf(categoryById.get(t.categoryId)) === 'monthly');
  const before = [1, 2, 3, 4].map((k) => shiftMonthKey(month, -k));

  const history = new Map(); // item key -> month -> entries
  for (const t of monthly) {
    if (!before.includes(monthOf(t.date))) continue;
    const months = history.get(itemKey(t)) ?? new Map();
    months.set(monthOf(t.date), [...(months.get(monthOf(t.date)) ?? []), t]);
    history.set(itemKey(t), months);
  }

  const fixed = [];
  for (const [key, months] of history) {
    if (months.size < 3) continue;
    const groups = [...months.values()];
    if (median(groups.map((g) => g.length)) > 1) continue;
    const sums = groups.map(sumOf);
    if (Math.max(...sums) > 1.5 * Math.min(...sums)) continue;
    const latest = [...months.keys()].sort().pop();
    const sample = months.get(latest)[0];
    fixed.push({
      key,
      categoryId: sample.categoryId,
      label: asName(sample.note) || categoryById.get(sample.categoryId)?.name || 'Payment',
      expected: sumOf(months.get(latest)),
      usualDay: Math.round(median(groups.map((g) => Math.min(...g.map((t) => Number(t.date.slice(8))))))),
    });
  }

  const current = monthly.filter((t) => monthOf(t.date) === month);
  const ticked = new Set();
  const items = fixed.map((f) => {
    const paid = current.filter((t) => itemKey(t) === f.key);
    paid.forEach((t) => ticked.add(t));
    const paidDate = paid.map((t) => t.date).sort()[0] ?? null;
    return { ...f, entries: paid, paid: paid.length > 0, paidDate, amount: paid.length > 0 ? sumOf(paid) : f.expected };
  });
  const dayOf = (item) => (item.paidDate ? Number(item.paidDate.slice(8)) : item.usualDay);
  items.sort((a, b) => dayOf(a) - dayOf(b) || a.label.localeCompare(b.label));

  // A category's usual month: the average of the six before, counting only
  // months since spending was first recorded.
  const firstMonth = firstDate ? monthOf(firstDate) : month;
  const usualMonths = [1, 2, 3, 4, 5, 6].map((k) => shiftMonthKey(month, -k)).filter((m) => m >= firstMonth);

  const bars = [];
  const others = [];
  const categoryIds = [...new Set(monthly.map((t) => t.categoryId))];
  for (const id of categoryIds) {
    const category = categoryById.get(id) ?? UNKNOWN;
    const leftover = current.filter((t) => t.categoryId === id && !ticked.has(t));
    const total = sumOf(leftover);
    if (fixed.some((f) => f.categoryId === id)) {
      if (total > 0) others.push({ category, entries: leftover, total });
      continue;
    }
    const usual = usualMonths.length > 0
      ? usualMonths.reduce((t, m) => t + sumOf(monthly.filter((e) => e.categoryId === id && monthOf(e.date) === m)), 0) / usualMonths.length
      : 0;
    if (total > 0 || usual >= 1) bars.push({ category, entries: leftover, total, usual });
  }
  bars.sort((a, b) => b.usual - a.usual || b.total - a.total);
  others.sort((a, b) => b.total - a.total);

  return { items, bars, others, total: sumOf(current) };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The year's large things, each by name and largest first. A trip is one
// line with its whole cost, and older travel entries that were never in a
// trip are put together by month.
export function bigThings(entries, categoryById, journalById) {
  const groups = new Map();
  for (const t of entries) {
    const category = categoryById.get(t.categoryId) ?? UNKNOWN;
    let key;
    let make;
    if (t.journalId != null) {
      key = `trip-${t.journalId}`;
      make = () => ({ kind: 'trip', journal: journalById.get(t.journalId), label: journalById.get(t.journalId)?.name ?? 'A trip', icon: '✈️' });
    } else if (category.name?.toLowerCase() === 'travel') {
      key = `travel-${monthOf(t.date)}`;
      make = () => ({ kind: 'travel', label: `Travel in ${MONTH_NAMES[Number(t.date.slice(5, 7)) - 1]}`, icon: category.icon });
    } else {
      key = itemKey(t);
      make = () => ({ kind: 'item', label: asName(t.note) || category.name, icon: category.icon, category });
    }
    const group = groups.get(key) ?? { key, entries: [], total: 0, ...make() };
    group.entries.push(t);
    group.total += t.amount;
    groups.set(key, group);
  }
  return [...groups.values()].filter((g) => g.total > 0).sort((a, b) => b.total - a.total);
}

// Days and months that have gone by in a stretch of time, counting only from
// when spending was first recorded, for "a day" and "a month" averages.
export function elapsed(start, end, today, firstDate) {
  const from = firstDate && firstDate > start ? firstDate : start;
  const to = today < end ? today : end;
  if (to < from) return { days: 0, months: 0 };
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
  return { days: daysBetweenISO(from, to) + 1, months };
}

