import { useState, useEffect } from 'react';

// Detecta dispositivo com ponteiro coarse (celular/tablet) — funciona em
// retrato E paisagem, ao contrário do gate por largura (≤767px) que desliga
// em paisagem do mesmo celular (causa raiz do fix de v2.85.1)
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    setIsTouch(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isTouch;
}

export default useIsTouchDevice;
