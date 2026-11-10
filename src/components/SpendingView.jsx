import { useMemo } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import CategoryBreakdown, { REST_COLOR, UNKNOWN_CATEGORY, splitRows } from './CategoryBreakdown.jsx';
import { isUnconverted } from '../journals.js';
import DonutChart from './DonutChart.jsx';
import TransactionRow from './TransactionRow.jsx';
import TrendBars from './TrendBars.jsx';
import {
  PERIODS,
  containsDate,
  fillBuckets,
  getBuckets,
  getComparison,
  getRange,
  getRangeLabel,
  shiftAnchor,
} from '../periods.js';
import { formatCurrency, todayISO } from '../utils.js';

const TRIP_COLOR = '#0ea5e9';

function compareText(total, previousTotal, words, currency) {
  if (previousTotal <= 0) return null;
  const difference = total - previousTotal;
  if (Math.abs(difference) < 0.005) return `Same as ${words}`;
  return `${formatCurrency(Math.abs(difference), currency)} ${difference > 0 ? 'more' : 'less'} than ${words}`;
}

export default function SpendingView({ view, onViewChange, onEditTransaction }) {
  const { categoryById, journalById, transactions, currency } = useSpending();
  const { period } = view;
  const today = todayISO();
  const anchor = view.anchor ?? today;

  const range = useMemo(() => getRange(period, anchor), [period, anchor]);
  const isCurrent = containsDate(range, today);

  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);
  const inRange = useMemo(() => expenses.filter((t) => containsDate(range, t.date)), [expenses, range]);
  const total = inRange.reduce((sum, t) => sum + t.amount, 0);

  const comparison = getComparison(period, range, today);
  const previousTotal = expenses.reduce((sum, t) => (containsDate(comparison, t.date) ? sum + t.amount : sum), 0);
  const comparisonText = compareText(total, previousTotal, comparison.words, currency);

  const buckets = useMemo(() => fillBuckets(getBuckets(period, range), inRange), [period, range, inRange]);
  const elapsedBuckets = buckets.filter((b) => b.start <= today).length;
  const average = elapsedBuckets > 0 ? total / elapsedBuckets : 0;
  const averageUnit = period === 'year' ? 'a month' : 'a day';

  // A trip counts as one row here, the way it's one line on the main sheet.
  // Its food and transport split lives in the trip's own journal.
  const rows = useMemo(() => {
    const groups = new Map();
    for (const t of inRange) {
      const trip = journalById.get(t.journalId);
      const id = trip ? `trip-${trip.id}` : t.categoryId;
      const group = groups.get(id) ?? {
        id,
        amount: 0,
        category: trip
          ? { name: trip.name, icon: '✈️', color: TRIP_COLOR }
          : categoryById.get(t.categoryId) || UNKNOWN_CATEGORY,
      };
      group.amount += t.amount;
      groups.set(id, group);
    }
    return [...groups.values()].filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [categoryById, journalById, inRange]);

  // Trip spending that has no exchange rate yet can't go in a home-currency
  // total, so it's named here rather than silently left out.
  const uncounted = useMemo(() => {
    const byTrip = new Map();
    for (const t of inRange) {
      if (!isUnconverted(t)) continue;
      const entry = byTrip.get(t.journalId) ?? { amount: 0, currency: t.foreignCurrency, name: journalById.get(t.journalId)?.name };
      entry.amount += t.foreignAmount;
      byTrip.set(t.journalId, entry);
    }
    return [...byTrip.values()];
  }, [inRange, journalById]);

  const { top, rest, restTotal } = splitRows(rows);
  const slices = [
    ...top.map((r) => ({ id: r.id, label: r.category.name, value: r.amount, color: r.category.color })),
    ...(rest.length > 0
      ? [{ id: 'rest', label: `${rest.length} smaller categories`, value: restTotal, color: REST_COLOR }]
      : []),
  ];

  const setPeriod = (next) => onViewChange({ period: next, anchor: view.anchor });
  const step = (delta) => onViewChange({ period, anchor: shiftAnchor(period, anchor, delta) });
  const openBucket = (bucket) => onViewChange({ period: period === 'year' ? 'month' : 'day', anchor: bucket.start });

  return (
    <div className="view">
      <header className="view-header">
        <h1>Spending</h1>
      </header>

      <div className="segmented">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" className={period === p.key ? 'active' : ''} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="month-selector">
        <button type="button" className="month-arrow" onClick={() => step(-1)} aria-label="Previous period">‹</button>
        <div className="month-label">
          {getRangeLabel(period, range, today)}
          {!isCurrent && (
            <button type="button" className="month-today" onClick={() => onViewChange({ period, anchor: null })}>
              Today
            </button>
          )}
        </div>
        <button type="button" className="month-arrow" onClick={() => step(1)} aria-label="Next period" disabled={today <= range.end}>›</button>
      </div>

      <div className="chart-card">
        <DonutChart slices={slices} total={total}>
          <span className="donut-center-label">Spent</span>
          <span className="donut-center-value">{formatCurrency(total, currency)}</span>
        </DonutChart>
        {comparisonText && <span className="chart-compare">{comparisonText}</span>}
        {uncounted.map((u) => (
          <span key={u.name ?? u.currency} className="chart-uncounted">
            Not counted yet: {formatCurrency(u.amount, u.currency)}{u.name ? ` on ${u.name}` : ''}, until it has an exchange rate
          </span>
        ))}
      </div>

      {total <= 0 && uncounted.length === 0 ? (
        <p className="empty-hint">No spending recorded for this period. Tap + to add one.</p>
      ) : (
        <>
          {total > 0 && buckets.length > 0 && (
            <section className="section">
              <h2 className="section-title">{period === 'year' ? 'By month' : 'By day'}</h2>
              <div className="trend-card">
                <TrendBars
                  key={`${period}-${range.start}`}
                  buckets={buckets}
                  currency={currency}
                  today={today}
                  caption={`Average ${formatCurrency(average, currency)} ${averageUnit}`}
                  openLabel={period === 'year' ? 'View month' : 'View day'}
                  onOpen={openBucket}
                />
              </div>
            </section>
          )}

          {total > 0 && (
            <section className="section">
              <h2 className="section-title">By category</h2>
              <CategoryBreakdown key={`${period}-${range.start}`} rows={rows} total={total} currency={currency} />
            </section>
          )}

          {period === 'day' && (
            <section className="section">
              <h2 className="section-title">Entries</h2>
              <ul className="tx-list">
                {inRange.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} />)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
