import { useState, useEffect, useCallback, useRef } from 'react';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function useUpdateChecker(): {
  updateAvailable: boolean;
  dismiss: () => void;
  atualizarAgora: () => Promise<void>;
} {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const dismissedRef = useRef(false);
  const checkingRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.ready;
        } catch {
          return;
        }
      }
      if (!reg) return;

      if (reg.waiting) {
        setUpdateAvailable(true);
        return;
      }

      const onUpdateFound = () => {
        const newSW = reg!.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', function handler() {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      };
      reg.addEventListener('updatefound', onUpdateFound);
      await reg.update();
    } catch {
      // verificação de atualização falhou — ignora silenciosamente
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (dismissedRef.current) return;
    checkForUpdate();
    const id = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkForUpdate]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setUpdateAvailable(false);
  }, []);

  const atualizarAgora = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, []);

  return { updateAvailable, dismiss, atualizarAgora };
}
