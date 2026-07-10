import { useRef, useState } from 'react';
import { useDismissablePhase, useVisualViewportRect } from '../hooks/usePresentation.js';

const DRAG_DISMISS_THRESHOLD = 80;
const DRAG_FLING_DISTANCE = 500;
const EDGE_ZONE_WIDTH = 24;

export default function Page({ onClose, children }) {
  const { top, height } = useVisualViewportRect();
  const { phase, requestClose } = useDismissablePhase(onClose);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);

  const handleDragStart = (e) => {
    if (e.clientX > EDGE_ZONE_WIDTH) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is best-effort -- dragging still works as long as the
      // pointer stays within the page even if this isn't supported.
    }
    dragStartRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (dragStartRef.current === null) return;
    setDragX(Math.max(0, e.clientX - dragStartRef.current));
  };

  const handleDragEnd = () => {
    if (dragStartRef.current === null) return;
    dragStartRef.current = null;
    setIsDragging(false);
    if (dragX > DRAG_DISMISS_THRESHOLD) {
      setDragX(DRAG_FLING_DISTANCE);
      requestClose();
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      className={`page-backdrop ${phase}`}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div
        className={`page ${phase}`}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        {children(requestClose)}
      </div>
    </div>
  );
}
