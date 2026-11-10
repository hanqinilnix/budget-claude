import { createPortal } from 'react-dom';

// Used instead of window.confirm, which some browsers and embedded webviews
// cancel without ever showing, leaving the button looking dead. Rendered on
// body because full-screen pages are transformed and can scroll, which would
// otherwise carry a position: fixed overlay away with them.
export default function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }) {
  return createPortal(
    <div className="confirm-backdrop" role="alertdialog" aria-modal="true" aria-label={confirmLabel}>
      <div className="confirm-box">
        <p className="confirm-message">{message}</p>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn destructive" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
