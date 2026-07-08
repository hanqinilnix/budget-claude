import { useMemo, useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import MonthSelector from './MonthSelector.jsx';
import { currentMonthKey, formatCurrency, formatDateShort, monthKey as toMonthKey } from '../utils.js';

export default function TransactionsView({ onEditTransaction }) {
  const { categories, transactions, currency } = useBudget();
  const [month, setMonth] = useState(currentMonthKey());
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const monthTx = useMemo(
    () => transactions.filter((t) => toMonthKey(t.date) === month),
    [transactions, month]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of monthTx) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthTx]);

  return (
    <div className="view">
      <header className="view-header">
        <h1>History</h1>
      </header>
      <MonthSelector monthKey={month} onChange={setMonth} />

      {grouped.length === 0 ? (
        <p className="empty-hint">No transactions in this month yet.</p>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date} className="tx-group">
            <div className="tx-group-date">{formatDateShort(date)}</div>
            <ul className="tx-list">
              {items.map((t) => {
                const cat = categoryById.get(t.categoryId);
                return (
                  <li key={t.id} className="tx-row" onClick={() => onEditTransaction(t)}>
                    <span className="tx-icon" style={{ background: cat?.color }}>{cat?.icon || '❔'}</span>
                    <span className="tx-info">
                      <span className="tx-name">{cat?.name || 'Uncategorized'}</span>
                      {t.note && <span className="tx-note">{t.note}</span>}
                    </span>
                    <span className={`tx-amount ${t.type}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
