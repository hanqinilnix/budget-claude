import { useMemo, useState } from 'react';
import { useSpending } from '../context/SpendingContext.jsx';
import Chevron from './Chevron.jsx';
import TransactionRow from './TransactionRow.jsx';
import { currentMonthKey, formatCurrency, formatMonthName, formatWeekdayDayMonth, monthKey as toMonthKey, shiftMonthKey, todayISO } from '../utils.js';

// The exact record, month by month, with a total for each day.
export default function TransactionsView({ onEditTransaction }) {
  const { transactions, currency } = useSpending();
  const [month, setMonth] = useState(currentMonthKey());
  const isCurrent = month === currentMonthKey();
  const today = todayISO();

  const inMonth = useMemo(() => transactions.filter((t) => toMonthKey(t.date) === month), [transactions, month]);
  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of inMonth) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [inMonth]);
  const total = inMonth.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="view">
      <header className="top">
        <div className="title"><h1>History</h1></div>
        <div className="step">
          <button type="button" onClick={() => setMonth(shiftMonthKey(month, -1))} aria-label="Previous month"><Chevron /></button>
          <span>{formatMonthName(month)}</span>
          <button type="button" onClick={() => setMonth(shiftMonthKey(month, 1))} aria-label="Next month" disabled={isCurrent}><Chevron direction="right" /></button>
        </div>
        <div className="fig small">{formatCurrency(total, currency)}</div>
        <div className="note">
          {inMonth.length} {inMonth.length === 1 ? 'entry' : 'entries'}.
          {!isCurrent && <> <button type="button" className="link" onClick={() => setMonth(currentMonthKey())}>Back to this month</button></>}
        </div>
      </header>

      <div className="body">
        {grouped.length === 0 ? (
          <p className="empty-hint">Nothing logged in this month.</p>
        ) : (
          grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="h">
                {formatWeekdayDayMonth(date, today)}
                <small>{formatCurrency(items.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), currency)}</small>
              </h2>
              <ul className="rows">
                {items.map((t) => <TransactionRow key={t.id} transaction={t} onEdit={onEditTransaction} />)}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
