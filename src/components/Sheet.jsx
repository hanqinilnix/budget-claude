import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboardInset } from '../hooks/useKeyboardInset.js';

const TRANSITION_DURATION = 200;

export default function Sheet({ onClose, children }) {
  const keyboardInset = useKeyboardInset();
  const [phase, setPhase] = useState('entering'); // 'entering' | 'open' | 'closing'
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('open'));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => clearTimeout(closeTimeoutRef.current), []);

  const requestClose = useCallback(() => {
    setPhase('closing');
    closeTimeoutRef.current = setTimeout(onClose, TRANSITION_DURATION);
  }, [onClose]);

  const isOpen = phase === 'open';
  const translateY = isOpen ? -keyboardInset : 30;
  const opacity = isOpen ? 1 : phase === 'entering' ? 0.6 : 0;

  return (
    <div
      className="sheet-backdrop"
      onClick={requestClose}
      style={{
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.2s ease',
        '--keyboard-inset': `${keyboardInset}px`,
      }}
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${translateY}px)`,
          opacity,
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        <div className="sheet-handle" />
        {children(requestClose)}
      </div>
    </div>
  );
}
