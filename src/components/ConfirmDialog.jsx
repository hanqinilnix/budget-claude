import { createPortal } from 'react-dom';

// Used instead of window.confirm, which some browsers and embedded webviews
// cancel without ever showing, leaving the button looking dead. Rendered on
// body because full-screen pages are transformed and can scroll, which would
// otherwise carry a position: fixed overlay away with them.
export default function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }) {
  return createPortal(
    <div className="confirm-backdrop" role="alertdialog" aria-modal="true" aria-label={confirmLabel} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-box">
        <p className="confirm-message">{message}</p>
        <button type="button" className="cta danger" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="cta alt" onClick={onCancel}>Cancel</button>
      </div>
    </div>,
    document.body
  );
}
