import { useState, useCallback, useEffect } from 'react';

const ZOOM_MIN = 80;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;

function getOrientationDefault(): number {
  return window.matchMedia('(orientation: portrait)').matches ? 150 : 90;
}

function getStoredZoom(): number {
  try {
    const stored = localStorage.getItem('app_zoom');
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val >= ZOOM_MIN && val <= ZOOM_MAX) return val;
    }
  } catch { /* ignore */ }
  return getOrientationDefault();
}

export function useZoom() {
  const [zoom, setZoomState] = useState(getStoredZoom);
  const [orientationDefault, setOrientationDefault] = useState(getOrientationDefault);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = () => setOrientationDefault(getOrientationDefault());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
    localStorage.setItem('app_zoom', zoom.toString());
  }, [zoom]);

  const aumentar = useCallback(() => {
    setZoomState((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP));
  }, []);

  const diminuir = useCallback(() => {
    setZoomState((prev) => Math.max(ZOOM_MIN, prev - ZOOM_STEP));
  }, []);

  const resetar = useCallback(() => {
    setZoomState(orientationDefault);
  }, [orientationDefault]);

  return { zoom, aumentar, diminuir, resetar, ZOOM_MIN, ZOOM_MAX, orientationDefault };
}

export default useZoom;
