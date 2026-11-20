import { useState, useEffect, useCallback, useRef } from 'react';
import { buscarUltimaVersao, compararVersoes, versaoValida } from '../utils/version';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DISMISSED_KEY = 'fiz_update_dismissed';

export function useUpdateChecker(): {
  updateAvailable: boolean;
  dismiss: () => void;
  atualizarAgora: () => Promise<void>;
} {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const dismissedRef = useRef(false);
  const checkingRef = useRef(false);

  const versaoDismissada = (): string | null => {
    try {
      return localStorage.getItem(DISMISSED_KEY);
    } catch {
      return null;
    }
  };

  const checkForUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const atual = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
      const ultima = await buscarUltimaVersao();
      // Não considera atualização se a versão atual for inválida ('dev', '', não-semver)
      // ou se não houver versão no servidor — evita falso positivo de banner permanente
      // Se o usuário já dispensou esta versão (dismiss persistido), não reapresenta o banner
      if (
        ultima &&
        atual &&
        versaoValida(atual) &&
        versaoDismissada() !== atual &&
        compararVersoes(ultima, atual) > 0
      ) {
        setUpdateAvailable(true);
      }
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
    try {
      const atual = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
      if (atual) localStorage.setItem(DISMISSED_KEY, atual);
    } catch {
      // localStorage indisponível — dismiss só vale para a sessão atual
    }
  }, []);

  const atualizarAgora = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, []);

  return { updateAvailable, dismiss, atualizarAgora };
}
