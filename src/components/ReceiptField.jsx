import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSpending } from '../context/SpendingContext.jsx';

function useObjectUrl(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return undefined;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return blob ? url : null;
}

// Tapping the photo toggles between fitting the screen and a zoomed view that
// scrolls, since the app turns off pinch-zoom.
function ReceiptViewer({ url, onClose }) {
  const [zoomed, setZoomed] = useState(false);
  return createPortal(
    <div className="receipt-viewer" role="dialog" aria-modal="true" aria-label="Receipt photo" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="receipt-viewer-close" onClick={onClose} aria-label="Close receipt">✕</button>
      <div className="receipt-viewer-scroll">
        <img src={url} alt="Receipt" className={zoomed ? 'zoomed' : ''} onClick={() => setZoomed((v) => !v)} />
      </div>
    </div>,
    document.body
  );
}

// savedId is the receipt already stored for this entry. pendingBlob is a photo
// picked in this form, which isn't stored until the entry is saved.
export default function ReceiptField({ savedId, pendingBlob, busy, onPick, onRemove }) {
  const { getReceipt } = useSpending();
  const [savedBlob, setSavedBlob] = useState(null);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    if (!savedId) return undefined;
    let current = true;
    getReceipt(savedId).then((blob) => {
      if (current) setSavedBlob(blob);
    });
    return () => {
      current = false;
    };
  }, [savedId, getReceipt]);

  const url = useObjectUrl(pendingBlob ?? (savedId ? savedBlob : null));
  const hasReceipt = Boolean(pendingBlob || savedId);

  const filePicker = (label, className) => (
    <label className={className}>
      {busy ? 'Adding…' : label}
      <input
        type="file"
        accept="image/*"
        hidden
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // so picking the same photo again still counts as a change
          if (file) onPick(file);
        }}
      />
    </label>
  );

  return (
    <div className="field">
      <span>Photo (optional)</span>
      {hasReceipt ? (
        <div className="receipt-attached">
          <button type="button" className="receipt-thumb" onClick={() => setViewing(true)} aria-label="View receipt" disabled={!url}>
            {url && <img src={url} alt="" />}
          </button>
          <div className="receipt-actions">
            {filePicker('Replace', 'btn small ghost')}
            <button type="button" className="btn small ghost" onClick={onRemove}>Remove</button>
          </div>
        </div>
      ) : (
        filePicker('Add receipt photo', 'btn ghost receipt-add')
      )}
      {viewing && url && <ReceiptViewer url={url} onClose={() => setViewing(false)} />}
    </div>
  );
}
