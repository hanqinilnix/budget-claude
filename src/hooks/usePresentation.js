import { useCallback, useEffect, useRef, useState } from 'react';

const TRANSITION_DURATION = 200;

function getViewportRect() {
  const vv = window.visualViewport;
  return vv ? { top: vv.offsetTop, height: vv.height } : { top: 0, height: window.innerHeight };
}

export function useVisualViewportRect() {
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

export function useDismissablePhase(onClose) {
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

  return { phase, requestClose };
}
