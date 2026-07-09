import { useCallback, useEffect, useRef, useState } from 'react';

const TRANSITION_DURATION = 200;

export default function Sheet({ onClose, children }) {
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

  return (
    <div className={`sheet-backdrop ${phase}`} onClick={requestClose}>
      <div className={`sheet ${phase}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children(requestClose)}
      </div>
    </div>
  );
}
