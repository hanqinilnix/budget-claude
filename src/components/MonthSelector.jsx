import { formatMonthLabel, shiftMonthKey, currentMonthKey } from '../utils.js';

export default function MonthSelector({ monthKey, onChange }) {
  const isCurrent = monthKey === currentMonthKey();
  return (
    <div className="month-selector">
      <button type="button" className="month-arrow" onClick={() => onChange(shiftMonthKey(monthKey, -1))} aria-label="Previous month">
        ‹
      </button>
      <div className="month-label">
        {formatMonthLabel(monthKey)}
        {!isCurrent && (
          <button type="button" className="month-today" onClick={() => onChange(currentMonthKey())}>
            Today
          </button>
        )}
      </div>
      <button
        type="button"
        className="month-arrow"
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        aria-label="Next month"
        disabled={isCurrent}
      >
        ›
      </button>
    </div>
  );
}
