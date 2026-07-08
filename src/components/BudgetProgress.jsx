import { formatCurrency } from '../utils.js';

export default function BudgetProgress({ category, spent, currency }) {
  const budget = category.budget || 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = budget > 0 && spent > budget;
  const statusClass = overBudget ? 'over' : pct >= 80 ? 'warn' : 'ok';

  return (
    <div className="budget-progress">
      <div className="budget-progress-header">
        <span className="budget-progress-name">
          <span className="budget-progress-icon" style={{ background: category.color }}>{category.icon}</span>
          {category.name}
        </span>
        <span className={`budget-progress-amount ${overBudget ? 'over-text' : ''}`}>
          {formatCurrency(spent, currency)}
          {budget > 0 && <span className="budget-progress-total"> / {formatCurrency(budget, currency)}</span>}
        </span>
      </div>
      {budget > 0 && (
        <div className="budget-progress-track">
          <div
            className={`budget-progress-fill ${statusClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
