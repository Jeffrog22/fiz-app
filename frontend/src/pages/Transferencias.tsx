import React, { useState, useCallback, useEffect, useMemo } from 'react';
import api from '../utils/api';
import SearchInput from '../components/SearchInput';
import AceitarTransferenciaModal from '../components/modals/AceitarTransferenciaModal';
import type { Aluno, Turma, Professor, TransferenciaUnidade } from '../types';
import { normalizeSearch, calcIdade, formatDateBR, formatarNomeMobile } from '../utils/formatters';
import { getTenantNome, getAvailableTenants } from '../utils/tenant';
import { useTenant } from '../hooks/useTenant';
import { ArrowRight, Check, X, Clock, Eye } from 'lucide-react';

type Aba = 'alunos' | 'fila' | 'recebidas' | 'historico';

const Transferencias: React.FC = () => {
  const { tenantId } = useTenant();
  const [aba, setAba] = useState<Aba>('alunos');

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [filaGlobal, setFilaGlobal] = useState<TransferenciaUnidade[]>([]);
  const [recebidas, setRecebidas] = useState<TransferenciaUnidade[]>([]);
  const [historico, setHistorico] = useState<TransferenciaUnidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtro, setFiltro] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [tenantDestino, setTenantDestino] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [aceitarTarget, setAceitarTarget] = useState<TransferenciaUnidade | null>(null);
  const [visualizarTarget, setVisualizarTarget] = useState<TransferenciaUnidade | null>(null);

  const outrosTenants = useMemo(
    () => getAvailableTenants().filter((t) => t.id !== tenantId),
    [tenantId],
  );

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.grupo_id || t.id, t])), [turmas]);
  const professorMap = useMemo(() => new Map(professores.map((p) => [p.id, p.nome])), [professores]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [alunosRes, turmasRes, profsRes, filaRes, recebidasRes, historicoRes] = await Promise.all([
        api.get('/alunos'),
        api.get('/turmas'),
        api.get('/professores'),
        api.get('/transferencias/fila'),
        api.get('/transferencias/recebidas'),
        api.get('/transferencias/historico'),
      ]);
      setAlunos(alunosRes.data);
      setTurmas(turmasRes.data);
      setProfessores(profsRes.data);
      setFilaGlobal(filaRes.data);
      setRecebidas(recebidasRes.data);
      setHistorico(historicoRes.data);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err.message || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) carregar(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [carregar]);

  const alunosFiltrados = useMemo(() => {
    if (!filtro.trim()) return alunos;
    const q = normalizeSearch(filtro);
    return alunos.filter((a) => normalizeSearch(a.nome).includes(q));
  }, [alunos, filtro]);

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === alunosFiltrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(alunosFiltrados.map((a) => a.id)));
    }
  };

  const handleAdicionarAFila = async () => {
    if (!tenantDestino || selecionados.size === 0) return;
    setEnviando(true);
    try {
      await api.post('/transferencias', {
        aluno_ids: Array.from(selecionados),
        tenant_destino: tenantDestino,
      });
      setSelecionados(new Set());
      setTenantDestino('');
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao adicionar a fila');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('Cancelar esta transferencia?')) return;
    try {
      await api.delete(`/transferencias/${id}`);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao cancelar');
    }
  };

  const handleAceitar = async (turmaId: string | undefined, nivel: string | undefined) => {
    if (!aceitarTarget) return;
    try {
      await api.post(`/transferencias/${aceitarTarget.id}/aceitar`, {
        turma_id: turmaId,
        nivel,
      });
      setAceitarTarget(null);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao aceitar transferencia');
    }
  };

  const alunosComTurma = useMemo(() => {
    return alunosFiltrados.map((a) => ({
      ...a,
      _turma: a.turma_id ? turmaMap.get(a.turma_id) : undefined,
    }));
  }, [alunosFiltrados, turmaMap]);

  const enviadasPendentes = useMemo(() => {
    return filaGlobal.filter((t) => t.tenant_id === tenantId);
  }, [filaGlobal, tenantId]);

  const tempoRelativo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const dias = Math.floor(hrs / 24);
    return `${dias}d`;
  };

  const tabs: { key: Aba; label: string; count?: number }[] = [
    { key: 'alunos', label: 'Alunos' },
    { key: 'fila', label: 'Fila', count: filaGlobal.length },
    { key: 'recebidas', label: 'Recebidas', count: recebidas.length },
    { key: 'historico', label: 'Histórico' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Transferências entre piscinas
      </h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key)}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              aba === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {erro && !carregando && (
        <p className="text-sm text-red-500 dark:text-red-400">{erro}</p>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      ) : (
        <>
          {/* ─── Aba Alunos ─── */}
          {aba === 'alunos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SearchInput
                  value={filtro}
                  onChange={setFiltro}
                  placeholder="Buscar aluno..."
                  className="max-w-sm"
                />
                {selecionados.size > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={tenantDestino}
                      onChange={(e) => setTenantDestino(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm"
                    >
                      <option value="">Unidade destino...</option>
                      {outrosTenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAdicionarAFila}
                      disabled={!tenantDestino || enviando}
                      className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ArrowRight size={14} />
                      Adicionar ({selecionados.size})
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selecionados.size === alunosFiltrados.length && alunosFiltrados.length > 0}
                          onChange={toggleTodos}
                          className="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded"
                        />
                      </th>
                      <th className="text-left px-4 py-3">Nome</th>
                      <th className="text-left px-4 py-3">Idade</th>
                      <th className="text-left px-4 py-3">Turma</th>
                      <th className="text-left px-4 py-3">Horario</th>
                      <th className="text-left px-4 py-3">Nivel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {alunosComTurma.map((a) => (
                      <tr
                        key={a.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                          selecionados.has(a.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                        onClick={() => toggleSelecionado(a.id)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selecionados.has(a.id)}
                            onChange={() => toggleSelecionado(a.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                          <span className="sm:hidden">{formatarNomeMobile(a.nome, alunos.map((x) => x.nome))}</span>
                          <span className="hidden sm:inline">{a.nome}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {calcIdade(a.data_nascimento) || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {a._turma?.label || a.turma_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {(a._turma?.horario || '').slice(0, 5) || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {a.nivel || '-'}
                        </td>
                      </tr>
                    ))}
                    {alunosComTurma.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                          Nenhum aluno encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {enviadasPendentes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Na fila desta unidade ({enviadasPendentes.length})
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-left px-4 py-3">Aluno</th>
                          <th className="text-left px-4 py-3">Destino</th>
                          <th className="text-left px-4 py-3">Turma sugerida</th>
                          <th className="text-left px-4 py-3">Data</th>
                          <th className="text-left px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {enviadasPendentes.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                              {t.dados_aluno.nome}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {getTenantNome(t.tenant_destino)}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {t.turma_sugerida || '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                              {tempoRelativo(t.criado_em)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleCancelar(t.id)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Aba Fila Global ─── */}
          {aba === 'fila' && (
            <div className="space-y-2">
              {filaGlobal.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhuma transferencia pendente na fila global.
                </p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3">Aluno</th>
                        <th className="text-left px-4 py-3">Horario</th>
                        <th className="text-left px-4 py-3">Professor</th>
                        <th className="text-left px-4 py-3">Nivel</th>
                        <th className="text-left px-4 py-3">Origem</th>
                        <th className="text-left px-4 py-3">Destino</th>
                        <th className="text-left px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filaGlobal.map((t) => {
                        const isMinha = t.tenant_id === tenantId;
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                              {t.dados_aluno.nome}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {(t.dados_aluno.turma_horario || '').slice(0, 5) || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {t.dados_aluno.turma_professor || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {t.nivel_sugerido || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {getTenantNome(t.tenant_id)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                t.tenant_destino === tenantId
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {getTenantNome(t.tenant_destino)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setVisualizarTarget(t)}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                  title="Visualizar dados"
                                >
                                  <Eye size={14} />
                                </button>
                                {isMinha && (
                                  <button
                                    onClick={() => handleCancelar(t.id)}
                                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                    title="Sair da fila"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[10px] text-gray-400 dark:text-gray-600">
                              {tempoRelativo(t.criado_em)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Aba Recebidas ─── */}
          {aba === 'recebidas' && (
            <div className="space-y-2">
              {recebidas.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhuma transferencia pendente recebida.
                </p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3">Aluno</th>
                        <th className="text-left px-4 py-3">Idade</th>
                        <th className="text-left px-4 py-3">Origem</th>
                        <th className="text-left px-4 py-3">Turma origem</th>
                        <th className="text-left px-4 py-3">Horario</th>
                        <th className="text-left px-4 py-3">Nivel</th>
                        <th className="text-left px-4 py-3">Data</th>
                        <th className="text-left px-4 py-3">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {recebidas.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                            {t.dados_aluno.nome}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {calcIdade(t.dados_aluno.data_nascimento) || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {getTenantNome(t.tenant_id)}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {t.dados_aluno.turma_label || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {(t.dados_aluno.turma_horario || '').slice(0, 5) || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {t.nivel_sugerido || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {formatDateBR(t.criado_em)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setAceitarTarget(t)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition flex items-center gap-1"
                            >
                              <Check size={12} />
                              Aceitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Aba Historico ─── */}
          {aba === 'historico' && (
            <div className="space-y-2">
              {historico.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhuma transferencia processada.
                </p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3">Aluno</th>
                        <th className="text-left px-4 py-3">Rota</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Criada em</th>
                        <th className="text-left px-4 py-3">Respondida em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {historico.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                            {t.dados_aluno.nome}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              {getTenantNome(t.tenant_id)}
                              <ArrowRight size={12} />
                              {getTenantNome(t.tenant_destino)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.status === 'aceita'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {t.status === 'aceita' ? <Check size={12} /> : <X size={12} />}
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {formatDateBR(t.criado_em)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {t.respondido_em ? formatDateBR(t.respondido_em) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AceitarTransferenciaModal
        open={!!aceitarTarget}
        transferencia={aceitarTarget}
        turmas={turmas}
        professores={professores}
        onAceitar={handleAceitar}
        onClose={() => setAceitarTarget(null)}
      />

      {/* Modal visualizar dados (readonly) */}
      {visualizarTarget && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40" onClick={() => setVisualizarTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Dados do Aluno</h3>
              <button onClick={() => setVisualizarTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {visualizarTarget.dados_aluno.nome}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                {visualizarTarget.dados_aluno.data_nascimento && (
                  <span>Nascimento: {formatDateBR(visualizarTarget.dados_aluno.data_nascimento)}</span>
                )}
                {calcIdade(visualizarTarget.dados_aluno.data_nascimento) != null && (
                  <span>Idade: {calcIdade(visualizarTarget.dados_aluno.data_nascimento)} anos</span>
                )}
                {visualizarTarget.dados_aluno.genero && <span>Genero: {visualizarTarget.dados_aluno.genero}</span>}
                {visualizarTarget.dados_aluno.contato && <span>Contato: {visualizarTarget.dados_aluno.contato}</span>}
                {visualizarTarget.dados_aluno.turma_label && <span>Turma: {visualizarTarget.dados_aluno.turma_label}</span>}
                {visualizarTarget.dados_aluno.turma_horario && <span>Horario: {visualizarTarget.dados_aluno.turma_horario}</span>}
                {visualizarTarget.dados_aluno.turma_professor && <span>Professor: {visualizarTarget.dados_aluno.turma_professor}</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span>Origem: <strong>{getTenantNome(visualizarTarget.tenant_id)}</strong></span>
                <span>→</span>
                <span>Destino: <strong>{getTenantNome(visualizarTarget.tenant_destino)}</strong></span>
              </div>
              {visualizarTarget.nivel_sugerido && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Nivel sugerido: <strong>{visualizarTarget.nivel_sugerido}</strong>
                </p>
              )}
              {visualizarTarget.motivo && (
                <p className="text-xs text-gray-500 dark:text-gray-500">Motivo: {visualizarTarget.motivo}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Adicionado {tempoRelativo(visualizarTarget.criado_em)} atras
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setVisualizarTarget(null)}
                className="text-sm px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Fechar
              </button>
              {visualizarTarget.tenant_destino === tenantId && (
                <button
                  onClick={() => { setVisualizarTarget(null); setAceitarTarget(visualizarTarget); }}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Aceitar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transferencias;
