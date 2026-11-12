import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import SearchInput from '../components/SearchInput';
import type {
  TransferenciaLote,
  TransferenciaLoteItem,
  StatusTransferenciaLote,
  StatusTransferenciaLoteItem,
  Turma,
  Aluno,
  Professor,
} from '../types';
import { getTenantNome } from '../utils/tenant';
import { formatDateBR } from '../utils/formatters';
import { Pencil, Trash2, RefreshCw, UserPlus, LogOut, Play, ShieldAlert, Clock } from 'lucide-react';

const STATUS_LABEL: Record<StatusTransferenciaLote, string> = {
  programado: 'Programado',
  revisao: 'Em revisão',
  aplicando: 'Aplicando',
  aplicado: 'Aplicado',
  cancelado: 'Cancelado',
  erro_parcial: 'Erro parcial',
};

const STATUS_ITEM_LABEL: Record<StatusTransferenciaLoteItem, string> = {
  pendente: 'Pendente',
  aplicado: 'Aplicado',
  conflito: 'Conflito de origem',
  erro: 'Erro',
};

const STATUS_COLOR: Record<StatusTransferenciaLote, string> = {
  programado: 'text-blue-600 dark:text-blue-400',
  revisao: 'text-yellow-600 dark:text-yellow-400',
  aplicando: 'text-purple-600 dark:text-purple-400',
  aplicado: 'text-green-600 dark:text-green-400',
  cancelado: 'text-gray-500 dark:text-gray-400',
  erro_parcial: 'text-red-600 dark:text-red-400',
};

const TransferenciasNivel: React.FC = () => {
  const navigate = useNavigate();
  const { isVisitante } = useAuth();
  const [lotes, setLotes] = useState<TransferenciaLote[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusTransferenciaLote | 'todos'>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [loteSelecionado, setLoteSelecionado] = useState<TransferenciaLote | null>(null);
  const [itensLote, setItensLote] = useState<TransferenciaLoteItem[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [acaoModal, setAcaoModal] = useState<'editar' | 'retirar' | 'aplicar' | 'cancelar' | 'detalhes'>('detalhes');
  const [itemRetirar, setItemRetirar] = useState<TransferenciaLoteItem | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [contadorPendentes, setContadorPendentes] = useState(0);

  const carregarLotes = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const url = filtroStatus === 'todos' ? '/api/transferencias-nivel/lotes' : `/api/transferencias-nivel/lotes?status=${filtroStatus}`;
      const res = await api.get(url);
      setLotes(res.data || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar lotes');
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregarLotes();
    const interval = setInterval(carregarLotes, 30000);
    return () => clearInterval(interval);
  }, [carregarLotes]);

  useEffect(() => {
    if (!isVisitante) {
      api.get('/api/transferencias-nivel/lotes/pendentes/count')
        .then((res) => setContadorPendentes(res.data.pendentes || 0))
        .catch(() => {});
    }
  }, []);

  const carregarLote = useCallback(async (loteId: string) => {
    try {
      const res = await api.get(`/api/transferencias-nivel/lotes/${loteId}`);
      setLoteSelecionado(res.data.lote);
      setItensLote(res.data.itens || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar lote');
    }
  }, []);

  const lotesFiltrados = lotes.filter((l) => {
    if (filtroBusca) {
      const termo = filtroBusca.toLowerCase();
      return l.turma_destino.toLowerCase().includes(termo) ||
             (l.professor_destino || '').toLowerCase().includes(termo);
    }
    return true;
  });

  const aplicarLote = async (loteId: string) => {
    if (!confirm('Confirmar a aplicação deste lote de transferências? Isso moverá os alunos para as turmas de destino a partir da data efetiva programada.')) return;
    setProcessando(loteId);
    try {
      const res = await api.post(`/api/transferencias-nivel/lotes/${loteId}/aplicar`);
      const { aplicados, erros, conflitos } = res.data;
      alert(`Aplicação concluída: ${aplicados} aplicado(s), ${erros} erro(s), ${conflitos} conflito(s).`);
      await carregarLotes();
      if (loteSelecionado?.id === loteId) await carregarLote(loteId);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao aplicar lote');
    } finally {
      setProcessando(null);
    }
  };

  const cancelarLote = async (loteId: string) => {
    if (!confirm('Cancelar este lote? Os alunos não serão movidos.')) return;
    try {
      await api.delete(`/api/transferencias-nivel/lotes/${loteId}`);
      await carregarLotes();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao cancelar lote');
    }
  };

  const podeAplicar = (lote: TransferenciaLote) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEfetiva = new Date(lote.data_efetiva);
    return lote.status === 'programado' && dataEfetiva <= hoje;
  };

  const getTurmaOrigemInfo = async (turmaId: string, professorId: string | undefined) => {
    // Busca informações da turma origem para exibição
    try {
      const res = await api.get(`/api/turmas?grupo_id=${turmaId}`);
      const turmas = res.data || [];
      return turmas[0];
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transferências de Nível</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Programe trocas de turma de alunos com data efetiva futura. As mudanças só são aplicadas após confirmação manual.
          </p>
        </div>
        {!isVisitante && (
          <button
            type="button"
            onClick={() => navigate('/transferencias-nivel/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
          >
            <UserPlus size={16} /> Programar transferência
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{erro}</p>
        </div>
      )}

      <div className="flex gap-3">
        <SearchInput
          value={filtroBusca}
          onChange={setFiltroBusca}
          placeholder="Buscar por turma destino, professor..."
          className="flex-1 max-w-md"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as any)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="todos">Todos os lotes</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lotesFiltrados.map((lote) => {
          const pode = podeAplicar(lote);
          return (
            <div key={lote.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <span className={`font-medium text-sm capitalize ${STATUS_COLOR[lote.status]}`}>
                  {STATUS_LABEL[lote.status]}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateBR(lote.data_efetiva)}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Turma destino: {lote.turma_destino}
              </h3>
              {lote.professor_destino && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Professor: {lote.professor_destino}</p>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {lote.itensPendentes} pendente · {lote.itensAplicados} aplicado · {lote.totalItens} total
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setLoteSelecionado(lote); carregarLote(lote.id); setModalAberto(true); setAcaoModal('detalhes'); }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  disabled={processando === lote.id}
                >
                  Detalhes
                </button>
                {!isVisitante && pode && (
                  <button
                    type="button"
                    onClick={() => aplicarLote(lote.id)}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={processando === lote.id}
                  >
                    <Play size={12} className="mr-1" /> Aplicar
                  </button>
                )}
                {!isVisitante && (
                  <button
                    type="button"
                    onClick={() => cancelarLote(lote.id)}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={processando === lote.id || lote.status === 'cancelado'}
                  >
                    <Trash2 size={12} className="mr-1" /> Cancelar
                  </button>
                )}
              </div>
              {processando === lote.id && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Aplicando...</p>
              )}
            </div>
          );
        })}
        {lotesFiltrados.length === 0 && (
          <div className="col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Nenhum lote encontrado.</p>
          </div>
        )}
      </div>

      {contadorPendentes > 0 && !isVisitante && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-center gap-3">
          <Clock size={18} className="text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            <strong>{contadorPendentes}</strong> lote(s) de transferência pendente(s) de aplicação.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransferenciasNivel;
