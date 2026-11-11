import { useSpending } from '../context/SpendingContext.jsx';
import { isUnconverted } from '../journals.js';
import { asName } from '../lenses.js';
import { formatCurrency } from '../utils.js';

// One entry. On a trip page the amount paid leads, in the trip's currency;
// everywhere else the home-currency amount does.
export default function TransactionRow({ transaction: t, onEdit, showTrip = true, showCategory = true, foreignFirst = false, inset = false }) {
  const { categoryById, journalById, currency } = useSpending();
  const category = categoryById.get(t.categoryId);
  const categoryName = category?.name || 'Uncategorized';
  const trip = showTrip ? journalById.get(t.journalId) : null;
  // Only the total shows here; the items live inside the entry.
  const itemCount = t.items?.length ?? 0;
  const receiptLabel = itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : t.receiptId ? 'Receipt' : null;
  const details = [t.note && showCategory ? categoryName : null, trip ? trip.name : null, receiptLabel].filter(Boolean).join(', ');

  const home = formatCurrency(t.amount, currency);
  const foreign = t.foreignAmount != null ? formatCurrency(t.foreignAmount, t.foreignCurrency) : null;
  let main = home;
  let second = foreign;
  if (isUnconverted(t)) {
    main = foreign;
    second = 'No rate yet';
  } else if (foreignFirst && foreign) {
    main = foreign;
    second = home;
  }

  return (
    <li>
      <button type="button" className={`row ${inset ? 'inset' : ''}`} onClick={() => onEdit(t)}>
        <span className={`ico ${inset ? 'small' : ''}`}>{category?.icon || '❔'}</span>
        <span className="grow">
          <b>{asName(t.note) || categoryName}</b>
          {details && <span className="sub">{details}</span>}
        </span>
        <span className="amt">
          {t.type === 'income' ? `+${main}` : main}
          {second && <small>{second}</small>}
        </span>
      </button>
    </li>
  );
}
