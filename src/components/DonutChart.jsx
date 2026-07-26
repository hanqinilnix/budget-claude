const SIZE = 220;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 2; // px of surface between touching segments
const LABEL_MIN_FRACTION = 0.1; // only label slices with room for the text
const DARK_INK = '#141519';

function relativeLuminance(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!match) return 0;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Whichever of ink/white contrasts better against the slice it sits on.
function labelColor(hex) {
  return relativeLuminance(hex) > 0.204 ? DARK_INK : '#ffffff';
}

export default function DonutChart({ slices, total, children }) {
  let cursor = 0;
  const segments = slices.map((slice) => {
    const fraction = total > 0 ? slice.value / total : 0;
    const segment = { ...slice, fraction, offset: cursor };
    cursor += fraction;
    return segment;
  });

  const multiple = segments.length > 1;
  const description = total > 0
    ? `Spending by category: ${segments.map((s) => `${s.label} ${Math.round(s.fraction * 100)}%`).join(', ')}`
    : 'No spending recorded for this period';

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={description}>
        {total <= 0 ? (
          <circle className="donut-track" cx={CENTER} cy={CENTER} r={RADIUS} strokeWidth={STROKE} />
        ) : (
          <>
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {segments.map((s) => {
                const length = s.fraction * CIRCUMFERENCE;
                const drawn = multiple ? Math.max(length - SEGMENT_GAP, 1) : length;
                return (
                  <circle
                    key={s.id}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                    strokeDashoffset={-s.offset * CIRCUMFERENCE}
                  />
                );
              })}
            </g>
            {segments
              .filter((s) => s.fraction >= LABEL_MIN_FRACTION)
              .map((s) => {
                const angle = (s.offset + s.fraction / 2) * 2 * Math.PI - Math.PI / 2;
                return (
                  <text
                    key={s.id}
                    className="donut-label"
                    x={CENTER + RADIUS * Math.cos(angle)}
                    y={CENTER + RADIUS * Math.sin(angle)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={labelColor(s.color)}
                  >
                    {Math.round(s.fraction * 100)}%
                  </text>
                );
              })}
          </>
        )}
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  );
}
