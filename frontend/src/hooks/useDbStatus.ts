import { useState, useEffect, useRef } from 'react';

export type DbStatus = 'checking' | 'online' | 'offline';

export function useDbStatus(intervalMs = 60000): DbStatus {
  const [status, setStatus] = useState<DbStatus>('checking');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const check = async () => {
      try {
        const res = await fetch('/health');
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
