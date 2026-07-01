import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

export type DbStatus = 'checking' | 'online' | 'offline';

export function useDbStatus(intervalMs = 60000): DbStatus {
  const [status, setStatus] = useState<DbStatus>('checking');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const check = async () => {
      try {
        const base = (api.defaults.baseURL || '/api').replace(/\/api\/?$/, '');
        const res = await fetch(base + '/health');
        const data = await res.json();
        if (mountedRef.current) {
          setStatus(data?.status === 'ok' ? 'online' : 'offline');
        }
      } catch {
        if (mountedRef.current) setStatus('offline');
      }
    };

    check();
    const id = setInterval(check, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
