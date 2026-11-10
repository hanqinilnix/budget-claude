import { useMemo, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import MonthSelector from './MonthSelector.jsx';
import TransactionRow from './TransactionRow.jsx';
import { currentMonthKey, formatDateShort, monthKey as toMonthKey } from '../utils.js';

export default function TransactionsView({ onEditTransaction }) {
  const { transactions } = useSpending();
  const [month, setMonth] = useState(currentMonthKey());

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of transactions) {
      if (toMonthKey(t.date) !== month) continue;
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions, month]);

  return (
    <div className="view">
      <header className="view-header">
        <h1>History</h1>
      </header>
      <MonthSelector monthKey={month} onChange={setMonth} />

      {grouped.length === 0 ? (
        <p className="empty-hint">No spending in this month yet.</p>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date} className="tx-group">
            <div className="tx-group-date">{formatDateShort(date)}</div>
            <ul className="tx-list">
              {items.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} />)}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
