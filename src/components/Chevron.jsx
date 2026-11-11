const TURN = { left: 0, up: 90, right: 180, down: 270 };

// Drawn rather than typed, because the bundled typeface has no ‹ and ›.
export default function Chevron({ direction = 'left', size = 18 }) {
  return (
    <svg viewBox="0 0 12 20" width={size * 0.6} height={size} aria-hidden="true" style={{ transform: `rotate(${TURN[direction]}deg)`, display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
