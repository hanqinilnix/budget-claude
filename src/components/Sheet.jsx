import { useCallback, useEffect, useRef, useState } from 'react';

const TRANSITION_DURATION = 200;
const DRAG_DISMISS_THRESHOLD = 100;
const DRAG_FLING_DISTANCE = 700;

function getViewportRect() {
  const vv = window.visualViewport;
  return vv ? { top: vv.offsetTop, height: vv.height } : { top: 0, height: window.innerHeight };
}

function useVisualViewportRect() {
  const [rect, setRect] = useState(getViewportRect);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setRect(getViewportRect());
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return rect;
}

export default function Sheet({ onClose, children }) {
  const { top, height } = useVisualViewportRect();
  const [phase, setPhase] = useState('entering'); // 'entering' | 'open' | 'closing'
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const closeTimeoutRef = useRef(null);
  const dragStartRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('open'));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => clearTimeout(closeTimeoutRef.current), []);

  const requestClose = useCallback(() => {
    setPhase('closing');
    closeTimeoutRef.current = setTimeout(onClose, TRANSITION_DURATION);
  }, [onClose]);

  const handleDragStart = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is best-effort -- dragging still works as long as the
      // pointer stays over the drag zone even if this isn't supported.
    }
    dragStartRef.current = e.clientY;
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (dragStartRef.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartRef.current));
  };

  const handleDragEnd = () => {
    if (dragStartRef.current === null) return;
    dragStartRef.current = null;
    setIsDragging(false);
    if (dragY > DRAG_DISMISS_THRESHOLD) {
      setDragY(DRAG_FLING_DISTANCE);
      requestClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <div
      className={`sheet-backdrop ${phase}`}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div
        className={`sheet ${phase}`}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        <div
          className="sheet-drag-zone"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="sheet-handle" />
        </div>
        {children(requestClose)}
      </div>
    </div>
  );
}
