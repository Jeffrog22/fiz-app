import { useContext, useCallback } from 'react';
import { DevContext, DevContextType } from '../context/DevContext';

export function useDevLog(): DevContextType {
  const context = useContext(DevContext);
  if (!context) {
    throw new Error('useDevLog deve ser usado dentro de um DevProvider');
  }
  return context;
}

export function useLogAction(): (message: string, data?: unknown) => void {
  const { addLog } = useDevLog();
  return useCallback((message: string, data?: unknown) => addLog('action', message, data), [addLog]);
}

export function useLogError(): (message: string, data?: unknown) => void {
  const { addLog } = useDevLog();
  return useCallback((message: string, data?: unknown) => addLog('error', message, data), [addLog]);
}

export default useDevLog;
