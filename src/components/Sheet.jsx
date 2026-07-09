import { useCallback, useState } from 'react';
import { useKeyboardInset } from '../hooks/useKeyboardInset.js';

const EXIT_DURATION = 200;

export default function Sheet({ onClose, children }) {
  const keyboardInset = useKeyboardInset();
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, EXIT_DURATION);
  }, [onClose]);

  return (
    <div
      className={`sheet-backdrop${closing ? ' closing' : ''}`}
      onClick={requestClose}
      style={{ '--keyboard-inset': `${keyboardInset}px` }}
    >
      <div className={`sheet${closing ? ' closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children(requestClose)}
      </div>
    </div>
  );
}
