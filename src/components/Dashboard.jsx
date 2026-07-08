import { useMemo, useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import MonthSelector from './MonthSelector.jsx';
import BudgetProgress from './BudgetProgress.jsx';
import { currentMonthKey, formatCurrency, formatDateShort, monthKey as toMonthKey } from '../utils.js';

export default function Dashboard({ onEditTransaction }) {
  const { categories, transactions, currency } = useBudget();
  const [month, setMonth] = useState(currentMonthKey());

  const monthTx = useMemo(
    () => transactions.filter((t) => toMonthKey(t.date) === month),
    [transactions, month]
  );

  const { income, expense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTx) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense };
  }, [monthTx]);

  const spentByCategory = useMemo(() => {
    const map = new Map();
    for (const t of monthTx) {
      if (t.type !== 'expense') continue;
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
    }
    return map;
  }, [monthTx]);

  const categoryRows = useMemo(() => {
    return categories
      .filter((c) => c.budget > 0)
      .map((c) => ({ category: c, spent: spentByCategory.get(c.id) || 0 }))
      .sort((a, b) => (b.spent / (b.category.budget || 1)) - (a.spent / (a.category.budget || 1)));
  }, [categories, spentByCategory]);

  const recent = monthTx.slice(0, 5);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className="view">
      <header className="view-header">
        <h1>Overview</h1>
      </header>
      <MonthSelector monthKey={month} onChange={setMonth} />

      <div className="summary-cards">
        <div className="summary-card income">
          <span className="summary-label">Income</span>
          <span className="summary-value">{formatCurrency(income, currency)}</span>
        </div>
        <div className="summary-card expense">
          <span className="summary-label">Spent</span>
          <span className="summary-value">{formatCurrency(expense, currency)}</span>
        </div>
        <div className="summary-card balance">
          <span className="summary-label">Balance</span>
          <span className="summary-value">{formatCurrency(income - expense, currency)}</span>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Budgets</h2>
        {categoryRows.length === 0 ? (
          <p className="empty-hint">Set budgets for your categories in the Budgets tab.</p>
        ) : (
          <div className="card-list">
            {categoryRows.map(({ category, spent }) => (
              <BudgetProgress key={category.id} category={category} spent={spent} currency={currency} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Recent transactions</h2>
        {recent.length === 0 ? (
          <p className="empty-hint">No transactions yet this month. Tap + to add one.</p>
        ) : (
          <ul className="tx-list">
            {recent.map((t) => {
              const cat = categoryById.get(t.categoryId);
              return (
                <li key={t.id} className="tx-row" onClick={() => onEditTransaction(t)}>
                  <span className="tx-icon" style={{ background: cat?.color }}>{cat?.icon || '❔'}</span>
                  <span className="tx-info">
                    <span className="tx-name">{cat?.name || 'Uncategorized'}</span>
                    <span className="tx-note">{t.note || formatDateShort(t.date)}</span>
                  </span>
                  <span className={`tx-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
