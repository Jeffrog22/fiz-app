import { useState, useCallback, useEffect } from 'react';

const ZOOM_MIN = 80;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

function getStoredZoom(): number {
  try {
    const stored = localStorage.getItem('app_zoom');
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val >= ZOOM_MIN && val <= ZOOM_MAX) return val;
    }
  } catch { /* ignore */ }
  return 100;
}

export function useZoom() {
  const [zoom, setZoomState] = useState(getStoredZoom);

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
    setZoomState(100);
  }, []);

  return { zoom, aumentar, diminuir, resetar, ZOOM_MIN, ZOOM_MAX };
}

export default useZoom;
