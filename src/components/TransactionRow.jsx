import { useSpending } from '../context/SpendingContext.jsx';
import { isUnconverted } from '../journals.js';
import { formatCurrency } from '../utils.js';

export default function TransactionRow({ transaction: t, onEdit, showTrip = true }) {
  const { categoryById, journalById, currency } = useSpending();
  const category = categoryById.get(t.categoryId);
  const categoryName = category?.name || 'Uncategorized';
  const trip = showTrip ? journalById.get(t.journalId) : null;
  // Only the total shows here; the items live inside the entry.
  const itemCount = t.items?.length ?? 0;
  const receiptLabel = itemCount > 0 ? `🧾 ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : t.receiptId ? '🧾 Receipt' : null;
  const details = [t.note ? categoryName : null, trip ? `✈️ ${trip.name}` : null, receiptLabel].filter(Boolean).join(' · ');

  return (
    <li className="tx-row" onClick={() => onEdit(t)}>
      <span className="tx-icon" style={{ background: category?.color }}>{category?.icon || '❔'}</span>
      <span className="tx-info">
        <span className="tx-name">{t.note || categoryName}</span>
        {details && <span className="tx-note">{details}</span>}
      </span>
      <span className="tx-amounts">
        {isUnconverted(t) ? (
          <span className="tx-amount expense">-{formatCurrency(t.foreignAmount, t.foreignCurrency)}</span>
        ) : (
          <>
            <span className={`tx-amount ${t.type}`}>
              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
            </span>
            {t.foreignAmount != null && <span className="tx-foreign">{formatCurrency(t.foreignAmount, t.foreignCurrency)}</span>}
          </>
        )}
      </span>
    </li>
  );
}
