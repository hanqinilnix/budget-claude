import { useBudget } from '../context/BudgetContext.jsx';
import { formatCurrency } from '../utils.js';

export default function BudgetsView({ onAddCategory, onEditCategory }) {
  const { categories, currency } = useBudget();

  const totalBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);

  return (
    <div className="view">
      <header className="view-header">
        <h1>Budgets</h1>
        <button type="button" className="btn small primary" onClick={onAddCategory}>+ Category</button>
      </header>

      <div className="summary-cards single">
        <div className="summary-card balance">
          <span className="summary-label">Total monthly budget</span>
          <span className="summary-value">{formatCurrency(totalBudget, currency)}</span>
        </div>
      </div>

      <section className="section">
        <div className="card-list">
          {categories.map((c) => (
            <button key={c.id} type="button" className="category-row" onClick={() => onEditCategory(c)}>
              <span className="tx-icon" style={{ background: c.color }}>{c.icon}</span>
              <span className="tx-info">
                <span className="tx-name">{c.name}</span>
                <span className="tx-note">{c.budget > 0 ? `${formatCurrency(c.budget, currency)} / month` : 'No budget set'}</span>
              </span>
              <span className="category-chevron">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
