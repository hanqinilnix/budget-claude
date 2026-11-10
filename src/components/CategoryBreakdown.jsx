import { useState } from 'react';
import { formatCurrency } from '../utils.js';

// Part-to-whole stays readable up to ~6 slices; the rest fold into one bucket
// that expands on tap so no spending is hidden.
const MAX_SLICES = 6;
export const REST_COLOR = '#94a3b8';
export const UNKNOWN_CATEGORY = { name: 'Uncategorized', icon: '❔', color: REST_COLOR };

export function splitRows(rows) {
  const rest = rows.length > MAX_SLICES ? rows.slice(MAX_SLICES - 1) : [];
  const top = rest.length > 0 ? rows.slice(0, MAX_SLICES - 1) : rows;
  return { top, rest, restTotal: rest.reduce((sum, r) => sum + r.amount, 0) };
}

function formatPercent(value, total) {
  if (total <= 0) return '0%';
  const percent = (value / total) * 100;
  return percent < 1 ? '<1%' : `${Math.round(percent)}%`;
}

// rows: [{ id, amount, category: { name, icon, color } }], largest first.
export default function CategoryBreakdown({ rows, total, currency }) {
  const [restExpanded, setRestExpanded] = useState(false);
  const { top, rest, restTotal } = splitRows(rows);

  const renderRow = (r, extraClass = '') => (
    <li key={r.id} className={`tx-row static ${extraClass}`}>
      <span className={`tx-icon ${extraClass ? 'small' : ''}`} style={{ background: r.category.color }}>{r.category.icon}</span>
      <span className="tx-info">
        <span className="tx-name">{r.category.name}</span>
        <span className="tx-note">{formatPercent(r.amount, total)} of spending</span>
      </span>
      <span className="tx-amount expense">{formatCurrency(r.amount, currency)}</span>
    </li>
  );

  return (
    <ul className="tx-list">
      {top.map((r) => renderRow(r))}

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

      {restExpanded && rest.map((r) => renderRow(r, 'sub'))}
    </ul>
  );
}
