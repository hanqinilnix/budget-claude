import { useEffect, useMemo, useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import DonutChart from './DonutChart.jsx';
import {
  addDaysISO,
  endOfMonthISO,
  formatCurrency,
  formatDateShort,
  formatMonthLabel,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
} from '../utils.js';

const PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'rolling', label: '7 Days' },
  { key: 'week', label: 'Mon–Sun' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

// Part-to-whole stays readable up to ~6 slices; the rest fold into one bucket
// that expands on tap so no spending is hidden.
const MAX_SLICES = 6;
const REST_COLOR = '#94a3b8';
const UNKNOWN_CATEGORY = { name: 'Uncategorized', icon: '❔', color: '#94a3b8' };

// Categories the chart leaves out, kept per period. Stored as exclusions so a
// category added later shows up without having to be picked.
const HIDDEN_KEY = 'budget-hidden-categories';

function emptyHidden(fill = []) {
  return Object.fromEntries(PERIODS.map((p) => [p.key, fill]));
}

function loadHidden() {
  try {
    const stored = JSON.parse(localStorage.getItem(HIDDEN_KEY) || 'null');
    // Older builds stored one flat list shared by every period.
    if (Array.isArray(stored)) return emptyHidden(stored);
    if (stored && typeof stored === 'object') {
      return Object.fromEntries(
        PERIODS.map((p) => [p.key, Array.isArray(stored[p.key]) ? stored[p.key] : []])
      );
    }
  } catch {
    // Corrupt entry: fall back to showing everything.
  }
  return emptyHidden();
}

function getRange(period, today) {
  if (period === 'day') return { start: today, end: today };
  if (period === 'rolling') return { start: addDaysISO(today, -6), end: today };
  if (period === 'week') {
    const start = startOfWeekISO(today);
    return { start, end: addDaysISO(start, 6) };
  }
  if (period === 'year') {
    const year = today.slice(0, 4);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: startOfMonthISO(today), end: endOfMonthISO(today) };
}

function getRangeLabel(period, { start, end }) {
  if (period === 'day') return `Today · ${formatDateShort(start)}`;
  if (period === 'month') return formatMonthLabel(start.slice(0, 7));
  if (period === 'year') return start.slice(0, 4);
  const prefix = period === 'week' ? 'This week' : 'Last 7 days';
  return `${prefix} · ${formatDateShort(start)} – ${formatDateShort(end)}`;
}

function formatPercent(value, total) {
  if (total <= 0) return '0%';
  const percent = (value / total) * 100;
  return percent < 1 ? '<1%' : `${Math.round(percent)}%`;
}

export default function SpendingView() {
  const { categories, transactions, currency } = useBudget();
  const [period, setPeriod] = useState('rolling');
  const [restExpanded, setRestExpanded] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hiddenByPeriod, setHiddenByPeriod] = useState(loadHidden);

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenByPeriod));
  }, [hiddenByPeriod]);

  const today = todayISO();
  const range = useMemo(() => getRange(period, today), [period, today]);
  const hidden = useMemo(() => new Set(hiddenByPeriod[period] || []), [hiddenByPeriod, period]);
  const shownCount = categories.filter((c) => !hidden.has(c.id)).length;

  // Only ever rewrites the period on screen, so each one keeps its own picks.
  const setHiddenForPeriod = (next) => {
    setHiddenByPeriod((prev) => ({ ...prev, [period]: next(prev[period] || []) }));
  };

  const toggleCategory = (id) => {
    setHiddenForPeriod((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };

  const rows = useMemo(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const totals = new Map();
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (hidden.has(t.categoryId)) continue;
      if (t.date < range.start || t.date > range.end) continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount);
    }
    return [...totals.entries()]
      .map(([categoryId, amount]) => ({
        id: categoryId,
        amount,
        category: categoryById.get(categoryId) || UNKNOWN_CATEGORY,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categories, transactions, range, hidden]);

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const rest = rows.length > MAX_SLICES ? rows.slice(MAX_SLICES - 1) : [];
  const top = rest.length > 0 ? rows.slice(0, MAX_SLICES - 1) : rows;
  const restTotal = rest.reduce((sum, r) => sum + r.amount, 0);

  const slices = [
    ...top.map((r) => ({ id: r.id, label: r.category.name, value: r.amount, color: r.category.color })),
    ...(rest.length > 0
      ? [{ id: 'rest', label: `${rest.length} smaller categories`, value: restTotal, color: REST_COLOR }]
      : []),
  ];

  return (
    <div className="view">
      <header className="view-header">
        <h1>Spending</h1>
      </header>

      <div className="segmented">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={period === p.key ? 'active' : ''}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <button type="button" className="filter-header" onClick={() => setFilterOpen((v) => !v)}>
          <span>Categories · {PERIODS.find((p) => p.key === period).label}</span>
          <span className="filter-count">
            {shownCount === categories.length ? 'All' : `${shownCount} of ${categories.length}`} {filterOpen ? '▴' : '▾'}
          </span>
        </button>

        {filterOpen && (
          <div className="filter-body">
            <div className="category-grid">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`category-choice ${hidden.has(c.id) ? 'off' : 'selected'}`}
                  aria-pressed={!hidden.has(c.id)}
                  onClick={() => toggleCategory(c.id)}
                >
                  <span className="category-choice-icon" style={{ background: c.color }}>{c.icon}</span>
                  <span className="category-choice-name">{c.name}</span>
                </button>
              ))}
            </div>
            <div className="filter-actions">
              <button type="button" className="btn small ghost" onClick={() => setHiddenForPeriod(() => [])}>
                Show all
              </button>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setHiddenForPeriod(() => categories.map((c) => c.id))}
              >
                Hide all
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="chart-card">
        <DonutChart slices={slices} total={total}>
          <span className="donut-center-label">Spent</span>
          <span className="donut-center-value">{formatCurrency(total, currency)}</span>
        </DonutChart>
        <span className="chart-range">{getRangeLabel(period, range)}</span>
      </div>

      {total <= 0 ? (
        <p className="empty-hint">
          {shownCount === 0
            ? 'No categories selected. Pick some under Categories above.'
            : 'No spending recorded for this period. Tap + to add a transaction.'}
        </p>
      ) : (
        <section className="section">
          <h2 className="section-title">By category</h2>
          <ul className="tx-list">
            {top.map((r) => (
              <li key={r.id} className="tx-row static">
                <span className="tx-icon" style={{ background: r.category.color }}>{r.category.icon}</span>
                <span className="tx-info">
                  <span className="tx-name">{r.category.name}</span>
                  <span className="tx-note">{formatPercent(r.amount, total)} of spending</span>
                </span>
                <span className="tx-amount expense">{formatCurrency(r.amount, currency)}</span>
              </li>
            ))}

            {rest.length > 0 && (
              <li className="tx-row" onClick={() => setRestExpanded((v) => !v)}>
                <span className="tx-icon" style={{ background: REST_COLOR }}>⋯</span>
                <span className="tx-info">
                  <span className="tx-name">{rest.length} smaller categories</span>
                  <span className="tx-note">{formatPercent(restTotal, total)} of spending · tap to {restExpanded ? 'hide' : 'show'}</span>
                </span>
                <span className="tx-amount expense">{formatCurrency(restTotal, currency)}</span>
              </li>
            )}

            {restExpanded &&
              rest.map((r) => (
                <li key={r.id} className="tx-row static sub">
                  <span className="tx-icon small" style={{ background: r.category.color }}>{r.category.icon}</span>
                  <span className="tx-info">
                    <span className="tx-name">{r.category.name}</span>
                    <span className="tx-note">{formatPercent(r.amount, total)} of spending</span>
                  </span>
                  <span className="tx-amount expense">{formatCurrency(r.amount, currency)}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
