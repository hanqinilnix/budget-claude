// A row of columns, one per day or month. Tapping one picks it, which dims
// the others and puts its figure in the line underneath.
// columns: [{ key, value, label, title, isNow, disabled }]
export default function DayColumns({ columns, picked, onPick, dense = false, line }) {
  const max = Math.max(...columns.map((c) => c.value), 0);
  return (
    <>
      <div className={`cols ${dense ? 'dense' : ''} ${picked ? 'picking' : ''}`}>
        {columns.map((c) => (
          <button
            key={c.key}
            type="button"
            className={[c.isNow ? 'now' : '', picked === c.key ? 'picked' : ''].join(' ')}
            disabled={c.disabled}
            aria-label={c.title}
            aria-pressed={picked === c.key}
            onClick={() => onPick(picked === c.key ? null : c.key)}
          >
            {c.value > 0 && max > 0 && <i style={{ height: `${Math.max((c.value / max) * 100, 3)}%` }} />}
          </button>
        ))}
      </div>
      <div className={`axis ${dense ? 'dense' : ''}`} aria-hidden="true">
        {columns.map((c) => (
          <span key={c.key} className={c.isNow ? 'now' : ''}>{c.label}</span>
        ))}
      </div>
      {line && <div className="picked-line">{line}</div>}
    </>
  );
}
