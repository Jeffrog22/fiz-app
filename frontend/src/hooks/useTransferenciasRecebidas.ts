import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './useAuth';
import { useTenant } from './useTenant';

export function useTransferenciasRecebidas() {
  const { tenantId } = useTenant();
  const { isVisitante, isAuthenticated } = useAuth();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ativo = true;
    setTotal(0);
    if (!isAuthenticated || isVisitante) return;
    const carregar = async () => {
      try {
        const res = await api.get('/transferencias/recebidas');
        if (ativo) setTotal(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        // Mantém a última contagem confirmada durante falhas temporárias.
      }
    };
    const atualizar = () => { if (!document.hidden) void carregar(); };
    void carregar();
    const intervalo = window.setInterval(atualizar, 30000);
    document.addEventListener('visibilitychange', atualizar);
    window.addEventListener('transferencias:recebidas-mudou', atualizar);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener('transferencias:recebidas-mudou', atualizar);
    };
  }, [tenantId, isAuthenticated, isVisitante]);

  return total;
}
