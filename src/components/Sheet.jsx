import { useKeyboardInset } from '../hooks/useKeyboardInset.js';

export default function Sheet({ onClose, children }) {
  const keyboardInset = useKeyboardInset();

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{ '--keyboard-inset': `${keyboardInset}px` }}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}
