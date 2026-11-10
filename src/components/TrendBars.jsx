import { useState } from 'react';
import { formatCurrency } from '../utils.js';

// Spending over time as one series of bars. Tapping or hovering a bar puts its
// exact value in the line underneath, and that line can link through to it.
export default function TrendBars({ buckets, currency, today, caption, openLabel, onOpen }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const max = Math.max(...buckets.map((b) => b.value), 0);
  const selected = buckets.find((b) => b.key === selectedKey);

  const hover = (e, key) => {
    if (e.pointerType === 'mouse') setSelectedKey(key);
  };

  return (
    <div className="trend">
      <div className="trend-plot" onPointerLeave={(e) => hover(e, null)}>
        <span className="trend-max">{formatCurrency(max, currency)}</span>
        <div className="trend-bars">
          {buckets.map((b) => {
            const isFuture = b.start > today;
            return (
              <button
                key={b.key}
                type="button"
                className={`trend-column ${selected ? (selected === b ? 'selected' : 'dimmed') : ''}`}
                aria-label={`${b.title}: ${formatCurrency(b.value, currency)}`}
                disabled={isFuture}
                onClick={() => setSelectedKey(b.key)}
                onFocus={() => setSelectedKey(b.key)}
                onPointerEnter={(e) => hover(e, b.key)}
              >
                {b.value > 0 && max > 0 && (
                  <span className="trend-bar" style={{ height: `${Math.max((b.value / max) * 100, 2)}%` }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="trend-axis" aria-hidden="true">
        {buckets.map((b) => (
          <span key={b.key} className={b.start <= today && today <= b.end ? 'current' : ''}>{b.label}</span>
        ))}
      </div>
      <div className="trend-caption">
        {selected ? (
          <>
            <span><b>{selected.title}</b> · {formatCurrency(selected.value, currency)}</span>
            {onOpen && <button type="button" className="trend-open" onClick={() => onOpen(selected)}>{openLabel} ›</button>}
          </>
        ) : (
          <span>{caption}</span>
        )}
      </div>
    </div>
  );
}
