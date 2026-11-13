import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import SearchInput from '../components/SearchInput';
import PreviaChamada from '../components/transferencias/PreviaChamada';
import ListagemPrevia from '../components/transferencias/ListagemPrevia';
import type {
  Aluno,
  Professor,
  StatusTransferenciaLote,
  StatusTransferenciaLoteItem,
  TransferenciaLote,
  TransferenciaLoteItem,
  TransferenciaNivelPendencia,
  Turma,
} from '../types';
import { formatDateBR } from '../utils/formatters';
import {
  calcularVisaoGeral,
  coletarMovimentos,
  hojeSaoPaulo,
  isLoteAtivo,
  type MovimentoTransferencia,
} from '../utils/transferenciasUtils';
import { Pencil, Trash2, UserPlus, Play, ShieldAlert, Clock, X, LayoutGrid, CalendarRange, List, ClipboardList } from 'lucide-react';

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

const PAPEL_LABEL: Record<string, string> = {
  origem: 'Origem',
  destino: 'Destino',
  ambos: 'Origem e destino',
};

type Aba = 'visao' | 'previa' | 'lotes' | 'listagem';

const TransferenciasNivel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isVisitante } = useAuth();
  const redirectRef = useRef(false);

  const [aba, setAba] = useState<Aba>('visao');
  const [lotes, setLotes] = useState<TransferenciaLote[]>([]);
  const [itensPorLote, setItensPorLote] = useState<Record<string, TransferenciaLoteItem[]>>({});
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'pendentes' | 'todos' | StatusTransferenciaLote>('pendentes');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [loteSelecionado, setLoteSelecionado] = useState<TransferenciaLote | null>(null);
  const [itensLote, setItensLote] = useState<TransferenciaLoteItem[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [contadorPendentes, setContadorPendentes] = useState(0);
  const [pendenciasNivel, setPendenciasNivel] = useState<TransferenciaNivelPendencia[]>([]);
  const [editandoLote, setEditandoLote] = useState(false);
  const [turmaEditada, setTurmaEditada] = useState('');
  const [dataEditada, setDataEditada] = useState('');

  // Aba inicial pela URL (?aba=visao|previa|lotes) — permite abrir a aba
  // "Lotes pendentes" pelo link do guia visual.
  const abaParam = searchParams.get('aba');
  useEffect(() => {
    if (abaParam === 'visao' || abaParam === 'previa' || abaParam === 'lotes' || abaParam === 'listagem') {
      setAba(abaParam);
    }
  }, [abaParam]);

  const trocarAba = useCallback(
    (nova: Aba) => {
      setAba(nova);
      const params = new URLSearchParams(searchParams);
      if (nova === 'visao') params.delete('aba');
      else params.set('aba', nova);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const professorMap = useMemo(
    () => new Map(professores.map((p) => [p.id, p.nome])),
    [professores],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resLotes, resAlunos, resTurmas, resProfs, resNiveis] = await Promise.all([
        api.get('/transferencias-nivel/lotes'),
        api.get('/alunos?ativo=true'),
        api.get('/turmas'),
        api.get('/professores'),
        api.get('/transferencias-nivel/niveis-pendentes').catch(() => ({ data: [] })),
      ]);

      const listaLotes: TransferenciaLote[] = resLotes.data || [];
      setLotes(listaLotes);
      setAlunos(resAlunos.data || []);
      setTurmas(resTurmas.data || []);
      setProfessores(resProfs.data || []);
      setPendenciasNivel((resNiveis.data || []) as TransferenciaNivelPendencia[]);

      const pendentes = listaLotes.filter((l) => isLoteAtivo(l.status));
      setContadorPendentes(pendentes.length);

      const pares = await Promise.all(
        pendentes.map(async (lote) => {
          try {
            const res = await api.get(`/transferencias-nivel/lotes/${lote.id}`);
            return [lote.id, (res.data?.itens || []) as TransferenciaLoteItem[]] as const;
          } catch {
            return [lote.id, [] as TransferenciaLoteItem[]] as const;
          }
        }),
      );
      const mapa: Record<string, TransferenciaLoteItem[]> = {};
      for (const [id, itens] of pares) mapa[id] = itens;
      setItensPorLote(mapa);

      // Atalho do modal de programação: abrir diretamente o Detalhes do lote
      // indicado por ?loteAberto= (mesmo que filtros o ocultem na listagem).
      const loteAbertoParam = searchParams.get('loteAberto');
      if (loteAbertoParam && !redirectRef.current) {
        const lote = listaLotes.find((l) => l.id === loteAbertoParam);
        if (lote) {
          abrirLote(lote);
        }
      }

      // Rota sem pendências: volta para as chamadas
      if (!redirectRef.current && pendentes.length === 0) {
        redirectRef.current = true;
        navigate('/chamadas');
      }
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar transferências');
    } finally {
      setCarregando(false);
    }
  }, [navigate]);

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 30000);
    return () => clearInterval(interval);
  }, [carregar]);

  const lotesPendentes = useMemo(() => lotes.filter((l) => isLoteAtivo(l.status)), [lotes]);
  const lotesHistorico = useMemo(() => lotes.filter((l) => !isLoteAtivo(l.status)), [lotes]);

  const movimentos = useMemo(
    () => coletarMovimentos(lotesPendentes, itensPorLote),
    [lotesPendentes, itensPorLote],
  );

  const linhasVisao = useMemo(
    () =>
      calcularVisaoGeral({
        lotes: lotesPendentes,
        itensPorLote,
        alunosAtivos: alunos,
        turmas,
        professorMap,
        pendenciasNivel,
      }),
    [lotesPendentes, itensPorLote, alunos, turmas, professorMap, pendenciasNivel],
  );

  /** Proposta de mudança de nível vinculada ao lote selecionado */
  const propostaDoLote = useMemo(() => {
    if (!loteSelecionado?.nivel_pendencia_id) return null;
    return pendenciasNivel.find((p) => p.id === loteSelecionado.nivel_pendencia_id) || null;
  }, [pendenciasNivel, loteSelecionado]);

  const lotesFiltrados = useMemo(() => {    const base =
      filtroStatus === 'pendentes'
        ? lotesPendentes
        : filtroStatus === 'todos'
        ? lotes
        : lotes.filter((l) => l.status === filtroStatus);
    if (!filtroBusca) return base;
    const termo = filtroBusca.toLowerCase();
    return base.filter(
      (l) =>
        l.turma_destino.toLowerCase().includes(termo) ||
        (l.professor_destino || '').toLowerCase().includes(termo),
    );
  }, [filtroStatus, filtroBusca, lotes, lotesPendentes]);

  const podeAplicar = (lote: TransferenciaLote) => {
    if (!isLoteAtivo(lote.status)) return false;
    if (lote.mudar_nivel_turma && lote.nivel_conflito) return false;
    return lote.data_efetiva <= hojeSaoPaulo();
  };

  /** Texto da mudança de nível programada no lote (para a confirmação) */
  const descricaoMudancaNivel = (lote: TransferenciaLote): string | null => {
    if (!lote.mudar_nivel_turma) return null;
    const turma = turmas.find((t) => t.grupo_id === lote.turma_destino);
    const nivelAtual = lote.nivel_turma_atual ?? turma?.nivel ?? 'sem nível';
    return (
      `Mudança de nível da turma: ${nivelAtual} → ${lote.nivel_turma_novo || '—'}\n` +
      `  (turma ${lote.turma_destino}, a partir de ${formatDateBR(lote.data_efetiva)})`
    );
  };

  const abrirLote = async (lote: TransferenciaLote) => {
    setLoteSelecionado(lote);
    setItensLote(itensPorLote[lote.id] || []);
    setTurmaEditada(lote.turma_destino);
    setDataEditada(lote.data_efetiva);
    setEditandoLote(false);
    setModalAberto(true);
    try {
      const res = await api.get(`/transferencias-nivel/lotes/${lote.id}`);
      setLoteSelecionado(res.data?.lote || lote);
      setItensLote(res.data?.itens || []);
    } catch {
      /* mantém os dados já carregados */
    }
  };

  const aplicarLote = async (lote: TransferenciaLote) => {
    const qtd = (itensPorLote[lote.id] || []).filter((i) => i.status === 'pendente').length;
    const turmaDestino = turmas.find((t) => t.grupo_id === lote.turma_destino);
    const mudancaNivel = descricaoMudancaNivel(lote);
    const avisoConflito =
      lote.mudar_nivel_turma && lote.nivel_conflito
        ? '\n\nATENÇÃO: há uma proposta conflitante de mudança de nível para esta turma e data.\nA aplicação está bloqueada até a revisão das propostas.'
        : '';
    const ok = confirm(
      `Aprovar e aplicar o lote?\n\n` +
        `Turma de destino: ${lote.turma_destino}${turmaDestino ? ` (${turmaDestino.label} • ${(turmaDestino.horario || '').slice(0, 5)})` : ''}\n` +
        `Data efetiva: ${formatDateBR(lote.data_efetiva)}\n` +
        `Alunos: ${qtd}\n` +
        (mudancaNivel ? `${mudancaNivel}\n` : '') +
        `\nOs alunos serão movidos e a matrícula atual encerrada em ${formatDateBR(lote.data_efetiva)}.` +
        (mudancaNivel
          ? `\nO nível da turma inteira também será alterado a partir de ${formatDateBR(lote.data_efetiva)}.`
          : '') +
        avisoConflito,
    );
    if (!ok) return;
    setProcessando(lote.id);
    try {
      const res = await api.post(`/transferencias-nivel/lotes/${lote.id}/aplicar`);
      const { aplicados, erros, conflitos } = res.data;
      alert(`Aplicação concluída: ${aplicados} aplicado(s), ${erros} erro(s), ${conflitos} conflito(s).`);
      setModalAberto(false);
      await carregar();
      window.dispatchEvent(new CustomEvent('transferencias:contagem-mudou'));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao aplicar lote');
    } finally {
      setProcessando(null);
    }
  };

  const cancelarLote = async (lote: TransferenciaLote) => {
    if (!confirm('Cancelar este lote? Os alunos não serão movidos.')) return;
    try {
      await api.delete(`/transferencias-nivel/lotes/${lote.id}`);
      setModalAberto(false);
      await carregar();
      window.dispatchEvent(new CustomEvent('transferencias:contagem-mudou'));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao cancelar lote');
    }
  };

  const removerItem = async (item: TransferenciaLoteItem) => {
    if (!loteSelecionado) return;
    if (!confirm(`Retirar ${item.aluno_nome || 'o aluno'} deste lote?`)) return;
    try {
      const res = await api.delete(
        `/transferencias-nivel/lotes/${loteSelecionado.id}/itens/${item.aluno_id}`,
      );
      const resultado = res.data as {
        status?: string;
        itensRestantes?: number;
        canceladoAutomaticamente?: boolean;
      };
      await carregar();
      // O servidor cancela o lote automaticamente quando fica sem itens pendentes.
      // Usa a resposta do servidor (o estado local ainda pode estar defasado).
      if (resultado?.canceladoAutomaticamente) {
        setModalAberto(false);
        setLoteSelecionado(null);
        setItensLote([]);
      } else {
        await abrirLote(loteSelecionado);
      }
      // Atualiza o badge do menu imediatamente
      window.dispatchEvent(new CustomEvent('transferencias:contagem-mudou'));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao retirar aluno do lote');
    }
  };

  const salvarEdicaoLote = async () => {
    if (!loteSelecionado) return;
    try {
      await api.put(`/transferencias-nivel/lotes/${loteSelecionado.id}`, {
        turma_destino: turmaEditada,
        data_efetiva: dataEditada,
      });
      setEditandoLote(false);
      await carregar();
      window.dispatchEvent(new CustomEvent('transferencias:contagem-mudou'));
      await abrirLote(loteSelecionado);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao atualizar lote');
    }
  };

  const dataEfetivaBase = useMemo(() => {
    const datas = lotesPendentes.map((l) => l.data_efetiva).sort();
    return datas[0] || null;
  }, [lotesPendentes]);

  let professorAnterior = '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transferência</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Programe trocas de turma com data efetiva futura. As mudanças só são aplicadas após confirmação manual.
          </p>
        </div>
        {!isVisitante && (
          <button
            type="button"
            onClick={() => navigate('/alunos?modo=transferencia')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
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

      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => trocarAba('visao')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            aba === 'visao'
              ? 'border-purple-600 text-purple-700 dark:text-purple-300 font-medium'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <LayoutGrid size={15} /> Visão geral
        </button>
        <button
          type="button"
          onClick={() => trocarAba('previa')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            aba === 'previa'
              ? 'border-purple-600 text-purple-700 dark:text-purple-300 font-medium'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <CalendarRange size={15} /> Prévia de chamada
        </button>
        <button
          type="button"
          onClick={() => trocarAba('lotes')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            aba === 'lotes'
              ? 'border-purple-600 text-purple-700 dark:text-purple-300 font-medium'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <List size={15} /> Lotes pendentes
        </button>
        <button
          type="button"
          onClick={() => trocarAba('listagem')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            aba === 'listagem'
              ? 'border-purple-600 text-purple-700 dark:text-purple-300 font-medium'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <ClipboardList size={15} /> Listagem prévia
        </button>
      </div>

      {aba === 'visao' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Professor</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Turma</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Horário</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nível</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Papel</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Lotação atual</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Lotação projetada</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Entra</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Sai</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Permanece</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {linhasVisao.map((linha) => {
                const trocaProfessor = linha.professor_nome !== professorAnterior;
                professorAnterior = linha.professor_nome;
                const excede = linha.capacidade != null && linha.lotacao_projetada > linha.capacidade;
                const nivelMudou = linha.nivel_projetado && linha.nivel_projetado !== linha.nivel;
                return (
                  <tr key={linha.grupo_id} className={trocaProfessor ? 'border-t-2 border-gray-200 dark:border-gray-700' : ''}>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">{linha.professor_nome}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {linha.label}
                      <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{linha.grupo_id}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{linha.horario || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {nivelMudou ? (
                        <>
                          {linha.nivel || '—'} → <strong className="text-amber-700 dark:text-amber-300">{linha.nivel_projetado}</strong>
                          {linha.conflito_nivel && (
                            <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                              conflito
                            </span>
                          )}
                        </>
                      ) : (
                        linha.nivel || '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          linha.papel === 'destino'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            : linha.papel === 'origem'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {PAPEL_LABEL[linha.papel]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                      {linha.lotacao_atual}
                      {linha.capacidade !== null && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">/{linha.capacidade}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-center font-medium ${excede ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {linha.lotacao_projetada}
                      {excede && ' ⚠'}
                    </td>
                    <td className="px-3 py-2 text-center text-green-600 dark:text-green-400">{linha.entradas || '—'}</td>
                    <td className="px-3 py-2 text-center text-red-600 dark:text-red-400">{linha.saidas || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">{linha.permanentes}</td>
                  </tr>
                );
              })}
              {linhasVisao.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma turma afetada por transferências pendentes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {aba === 'previa' && (
        <PreviaChamada
          turmas={turmas}
          professores={professores}
          alunosAtivos={alunos}
          movimentos={movimentos}
          dataEfetivaBase={dataEfetivaBase}
          pendenciasNivel={pendenciasNivel}
        />
      )}

      {aba === 'listagem' && (
        <ListagemPrevia
          turmas={turmas}
          professores={professores}
          alunosAtivos={alunos}
          movimentos={movimentos}
          pendenciasNivel={pendenciasNivel}
          dataEfetivaBase={dataEfetivaBase}
        />
      )}

      {aba === 'lotes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Lotes {filtroStatus === 'pendentes' ? 'pendentes' : filtroStatus === 'todos' ? '' : 'históricos'}{' '}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({lotesFiltrados.length})</span>
            </h2>
            <div className="flex gap-3 items-center">
              <SearchInput
                value={filtroBusca}
                onChange={setFiltroBusca}
                placeholder="Buscar por turma destino, professor..."
                className="max-w-xs"
              />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="pendentes">Pendentes</option>
                <option value="todos">Todos os lotes</option>
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

        {contadorPendentes > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-center gap-3">
            <Clock size={18} className="text-amber-600 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>{contadorPendentes}</strong> lote(s) de transferência pendente(s) de aplicação.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lotesFiltrados.map((lote) => {
            const pode = podeAplicar(lote);
            const pendente = isLoteAtivo(lote.status);
            return (
              <div
                key={lote.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
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
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Professor: {professorMap.get(lote.professor_destino) || lote.professor_destino}
                  </p>
                )}
                {lote.mudar_nivel_turma && (
                  <p className="text-xs mb-2 text-amber-700 dark:text-amber-300">
                    Mudança de nível da turma: {lote.nivel_turma_atual || '—'} → {lote.nivel_turma_novo || '—'}
                    {lote.nivel_conflito && (
                      <span className="ml-1 px-1 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                        conflito — aplicação bloqueada
                      </span>
                    )}
                  </p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {lote.itensPendentes ?? 0} pendente · {lote.itensAplicados ?? 0} aplicado · {lote.totalItens ?? 0} total
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => abrirLote(lote)}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    disabled={processando === lote.id}
                  >
                    Detalhes
                  </button>
                  {!isVisitante && pendente && (
                    <button
                      type="button"
                      onClick={() => aplicarLote(lote)}
                      data-tour="lote-aprovar"
                      disabled={!pode || processando === lote.id}
                      title={
                        lote.mudar_nivel_turma && lote.nivel_conflito
                          ? 'Aplicação bloqueada: proposta conflitante de mudança de nível'
                          : pode
                          ? 'Aplicar a transferência'
                          : `Aplicação disponível a partir de ${formatDateBR(lote.data_efetiva)}`
                      }
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play size={12} className="mr-1 inline" /> Aprovar e aplicar
                    </button>
                  )}
                  {!isVisitante && pendente && (
                    <button
                      type="button"
                      onClick={() => cancelarLote(lote)}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={processando === lote.id}
                    >
                      <Trash2 size={12} className="mr-1 inline" /> Cancelar
                    </button>
                  )}
                </div>
                {pendente && !pode && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Aplicação liberada em {formatDateBR(lote.data_efetiva)}
                  </p>
                )}
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

        {filtroStatus === 'pendentes' && lotesHistorico.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lotesHistorico.length} lote(s) já aplicado(s) ou cancelado(s) — use o filtro para revisá-los.
          </p>
        )}
        </div>
      )}

      {modalAberto && loteSelecionado && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setModalAberto(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 border dark:border-gray-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Lote — destino {loteSelecionado.turma_destino}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {editandoLote ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma de destino</label>
                  <select
                    value={turmaEditada}
                    onChange={(e) => setTurmaEditada(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    {turmas.map((t) => (
                      <option key={t.grupo_id} value={t.grupo_id}>
                        {t.label} • {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data efetiva</label>
                  <input
                    type="date"
                    value={dataEditada}
                    onChange={(e) => setDataEditada(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditandoLote(false)}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarEdicaoLote}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 dark:bg-gray-900/60 rounded p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data efetiva</p>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{formatDateBR(loteSelecionado.data_efetiva)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/60 rounded p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <p className={`font-medium ${STATUS_COLOR[loteSelecionado.status]}`}>
                      {STATUS_LABEL[loteSelecionado.status]}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {loteSelecionado.mudar_nivel_turma && (
                    <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">Mudança de nível da turma programada</p>
                      <p>
                        {loteSelecionado.nivel_turma_atual || '—'} → <strong>{loteSelecionado.nivel_turma_novo || '—'}</strong>{' '}
                        · turma {loteSelecionado.turma_destino} · a partir de {formatDateBR(loteSelecionado.data_efetiva)}
                      </p>
                      <p className="mt-1">
                        Vale para toda a turma (alunos atuais e os que chegam por este lote). Até a confirmação, o
                        nível oficial continua vigente.
                      </p>
                      {loteSelecionado.nivel_conflito && (
                        <p className="mt-1 font-semibold text-red-700 dark:text-red-300">
                          Proposta conflitante: a aplicação deste lote está bloqueada até a revisão.
                        </p>
                      )}
                      {propostaDoLote && propostaDoLote.lotes && propostaDoLote.lotes.length > 1 && (
                        <p className="mt-1">
                          Esta mudança também depende de {propostaDoLote.lotes.length - 1} outro(s) lote(s) — será
                          aplicada na confirmação do primeiro lote confirmado.
                        </p>
                      )}
                    </div>
                  )}
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Aluno</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Origem</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Destino</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Situação</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensLote.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-2 text-gray-800 dark:text-gray-200">{item.aluno_nome || '—'}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{item.turma_origem || '—'}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{item.turma_destino}</td>
                          <td className="py-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {STATUS_ITEM_LABEL[item.status]}
                              {item.erro_mensagem ? ` — ${item.erro_mensagem}` : ''}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {!isVisitante && item.status === 'pendente' && (
                              <button
                                type="button"
                                onClick={() => removerItem(item)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400"
                                title="Retirar do lote"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {itensLote.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">
                            Lote sem itens.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!isVisitante && isLoteAtivo(loteSelecionado.status) && (
                  <div className="flex justify-end gap-2 mt-4 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditandoLote(true)}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarLote(loteSelecionado)}
                      disabled={!podeAplicar(loteSelecionado)}
                      title={podeAplicar(loteSelecionado) ? undefined : `Aplicação disponível a partir de ${formatDateBR(loteSelecionado.data_efetiva)}`}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aprovar e aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelarLote(loteSelecionado)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cancelar lote
                    </button>
                  </div>
                )}

                {isLoteAtivo(loteSelecionado.status) && !podeAplicar(loteSelecionado) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
                    <ShieldAlert size={13} /> A aplicação só é permitida a partir de {formatDateBR(loteSelecionado.data_efetiva)}.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferenciasNivel;
