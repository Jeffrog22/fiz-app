import React, { createContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';

export interface DevLog {
  id: number;
  timestamp: string;
  type: 'action' | 'api' | 'error' | 'console';
  message: string;
  data?: unknown;
}

export interface DevRequest {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  payload?: unknown;
  response?: unknown;
  status?: number;
}

export interface DevContextType {
  enabled: boolean;
  toggle: () => void;
  devModeAtivo: boolean;
  setDevModeAtivo: (v: boolean) => void;
  logs: DevLog[];
  addLog: (type: DevLog['type'], message: string, data?: unknown) => void;
  requests: DevRequest[];
  addRequest: (req: Omit<DevRequest, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  clearRequests: () => void;
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  triggerSync: () => void;
  errors: Array<{ timestamp: string; message: string; stack?: string }>;
  addError: (message: string, stack?: string) => void;
  consoleLines: Array<{ timestamp: string; level: string; args: unknown[] }>;
  addConsoleLine: (level: string, args: unknown[]) => void;
}

export const DevContext = createContext<DevContextType>({
  enabled: false,
  toggle: () => {},
  devModeAtivo: false,
  setDevModeAtivo: () => {},
  logs: [],
  addLog: () => {},
  requests: [],
  addRequest: () => {},
  clearLogs: () => {},
  clearRequests: () => {},
  lastSync: null,
  syncStatus: 'idle',
  syncError: null,
  triggerSync: () => {},
  errors: [],
  addError: () => {},
  consoleLines: [],
  addConsoleLine: () => {},
});

interface DevProviderProps {
  children: ReactNode;
}

export const DevProvider: React.FC<DevProviderProps> = ({ children }) => {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('dev_mode');
    return stored === 'true' && (import.meta.env.PROD ? import.meta.env.VITE_ALLOW_DEV_MODE === 'true' : true);
  });
  const [devModeAtivo, setDevModeAtivo] = useState(false);
  const [logs, setLogs] = useState<DevLog[]>([]);
  const [requests, setRequests] = useState<DevRequest[]>([]);
  const [errors, setErrors] = useState<Array<{ timestamp: string; message: string; stack?: string }>>([]);
  const [consoleLines, setConsoleLines] = useState<Array<{ timestamp: string; level: string; args: unknown[] }>>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const logId = useRef(0);
  const reqId = useRef(0);

  useEffect(() => {
    localStorage.setItem('dev_mode', enabled.toString());
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const addLog = useCallback((type: DevLog['type'], message: string, data?: unknown) => {
    logId.current += 1;
    setLogs((prev) => {
      const next = [{ id: logId.current, timestamp: new Date().toISOString(), type, message, data }, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const addRequest = useCallback((req: Omit<DevRequest, 'id' | 'timestamp'>) => {
    reqId.current += 1;
    setRequests((prev) => {
      const next = [{ id: reqId.current, timestamp: new Date().toISOString(), ...req }, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  useEffect(() => {
    const handleRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addRequest({ method: detail.method, url: detail.url });
    };
    const handleResponse = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addRequest({ method: detail.method, url: detail.url, status: detail.status });
    };
    window.addEventListener('dev:api-request', handleRequest);
    window.addEventListener('dev:api-response', handleResponse);
    return () => {
      window.removeEventListener('dev:api-request', handleRequest);
      window.removeEventListener('dev:api-response', handleResponse);
    };
  }, [addRequest]);

  const addError = useCallback((message: string, stack?: string) => {
    setErrors((prev) => [{ timestamp: new Date().toISOString(), message, stack }, ...prev].slice(0, 50));
  }, []);

  const addConsoleLine = useCallback((level: string, args: unknown[]) => {
    setConsoleLines((prev) => [{ timestamp: new Date().toISOString(), level, args }, ...prev].slice(0, 100));
  }, []);

  const triggerSync = useCallback(() => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const storedProfessor = localStorage.getItem('professor');
      if (storedProfessor) {
        localStorage.setItem('professor_sync', JSON.stringify({ lastSync: new Date().toISOString(), data: storedProfessor }));
      }
      window.dispatchEvent(new CustomEvent('dev:force-sync'));
      setLastSync(new Date().toISOString());
      setSyncStatus('success');
    } catch (e: any) {
      setSyncError(e.message);
      setSyncStatus('error');
    }
  }, []);

  return (
    <DevContext.Provider value={{
      enabled,
      toggle,
      devModeAtivo,
      setDevModeAtivo,
      logs,
      addLog,
      requests,
      addRequest,
      clearLogs: () => setLogs([]),
      clearRequests: () => setRequests([]),
      lastSync,
      syncStatus,
      syncError,
      triggerSync,
      errors,
      addError,
      consoleLines,
      addConsoleLine,
    }}>
      {children}
    </DevContext.Provider>
  );
};

export default DevContext;
