import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import type {
  Aluno,
  Professor,
  Turma,
  ConflitoAluno,
  ConflitosAlunosResponse,
  TransferenciaLoteCreateInput,
  TransferenciaLoteItemInput,
} from '../../types';
import { getTenantId } from '../../utils/tenant';
import {
  carregarPreferencia,
  salvarPreferencia,
  salvarProgramacaoPendente,
  carregarProgramacaoPendente,
  limparProgramacaoPendente,
} from '../../utils/transferenciaPreferencias';
import {
  hojeSaoPaulo,
  primeiroDiaMesSeguinte,
  projetarLotacaoDestino,
  type MovimentoTransferencia,
} from '../../utils/transferenciasUtils';
import { X, Loader2, AlertCircle, Users, ArrowRight, CalendarClock } from 'lucide-react';

interface TransferenciaLoteReviewModalProps {
  aberto: boolean;
  onClose: () => void;
  alunosSelecionados: Aluno[];
  /** Todos os alunos ativos da unidade — usado para projetar a lotação */
  alunosAtivos?: Aluno[];
  /** Movimentos já programados em outros lotes pendentes */
  movimentosPendentes?: MovimentoTransferencia[];
  onSucesso: () => void;
}

const TransferenciaLoteReviewModal: React.FC<TransferenciaLoteReviewModalProps> = ({
  aberto,
  onClose,
  alunosSelecionados,
  alunosAtivos = [],
  movimentosPendentes = [],
  onSucesso,
}) => {
  const { isVisitante, professorId: professorLogado } = useAuth();
  const navigate = useNavigate();
  const tenantId = getTenantId();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professorDestino, setProfessorDestino] = useState<string>('');
  const [turmaDestino, setTurmaDestino] = useState<string>('');
  const [dataEfetiva, setDataEfetiva] = useState(primeiroDiaMesSeguinte());
  const [motivo, setMotivo] = useState('');
  const [nivelDestino, setNivelDestino] = useState<string | null>(null);
  const [mudarNivelTurma, setMudarNivelTurma] = useState(false);
  const [nivelTurmaNovo, setNivelTurmaNovo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  /** Verificação de conflitos em andamento ao abrir o modal */
  const [verificandoConflitos, setVerificandoConflitos] = useState(false);
  /** Alunos da seleção que já possuem lote pendente */
  const [conflitos, setConflitos] = useState<ConflitoAluno[]>([]);

  type PreferenciaDestino = {
    professorId: string;
    turmaGrupoId: string;
  };

  const PREFERENCIA_TIPO = 'destino';

  // Origem de cada aluno: matrícula atual (turma_id + nivel) — somente leitura
  const origens = useMemo(
    () =>
      alunosSelecionados.map((a) => ({
        aluno_id: a.id,
        aluno_nome: a.nome,
        turma_origem: a.turma_id || '',
        nivel_origem: a.nivel || null,
      })),
    [alunosSelecionados],
  );

  const turmasDisponiveis = useMemo(() => {
    if (!professorDestino) return turmas;
    return turmas.filter((t) => t.professor_id === professorDestino);
  }, [professorDestino, turmas]);

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.grupo_id === turmaDestino) || null,
    [turmas, turmaDestino],
  );

  const projecao = useMemo(
    () =>
      projetarLotacaoDestino({
        turmaDestino: turmaSelecionada,
        alunosAtivos,
        alunoIdsSelecionados: alunosSelecionados.map((a) => a.id),
        movimentosPendentes,
      }),
    [turmaSelecionada, alunosAtivos, alunosSelecionados, movimentosPendentes],
  );

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resProf, resTur] = await Promise.all([
        api.get('/professores'),
        api.get('/turmas'),
      ]);
      setProfessores(resProf.data || []);
      const tenant = getTenantId();
      const lista: Turma[] = resTur.data || [];
      setTurmas(tenant ? lista.filter((t: any) => t.tenant_id === tenant) : lista);
    } catch {
      setErro('Erro ao carregar professores e turmas');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto || !professorLogado || !tenantId) return;
    setSucesso(null);
    setErro(null);
    setConflitos([]);
    setVerificandoConflitos(false);

    // Restaura o estado de programação salvo ao voltar do Detalhes do lote (atalho "Ver lote pendente")
    const pendente = carregarProgramacaoPendente(tenantId, professorLogado);
    if (pendente) {
      limparProgramacaoPendente(tenantId, professorLogado);
      setProfessorDestino(pendente.professorDestino);
      setTurmaDestino(pendente.turmaDestino);
      setDataEfetiva(pendente.dataEfetiva);
      setMotivo(pendente.motivo);
      setMudarNivelTurma(pendente.mudarNivelTurma);
      setNivelTurmaNovo(pendente.nivelTurmaNovo);
    } else {
      setTurmaDestino('');
      setNivelDestino(null);
      setMudarNivelTurma(false);
      setNivelTurmaNovo('');
      setDataEfetiva(primeiroDiaMesSeguinte());
    }
    carregarDados();
    verificarConflitosSelecao();
  }, [aberto, professorLogado, tenantId, carregarDados]);

  const verificarConflitosSelecao = useCallback(async () => {
    if (!aberto || !tenantId) return;
    const ids = alunosSelecionados.map((a) => a.id);
    if (ids.length === 0) {
      setConflitos([]);
      setVerificandoConflitos(false);
      return;
    }
    setVerificandoConflitos(true);
    try {
      const qs = ids.join(',');
      const res = await api.get<ConflitosAlunosResponse>(
        `/transferencias-nivel/conflitos-alunos?alunos=${qs}`,
      );
      setConflitos((res.data?.conflitos || []).filter((c) => ids.includes(c.aluno_id)));
    } catch {
      setConflitos([]);
    } finally {
      setVerificandoConflitos(false);
    }
  }, [aberto, tenantId, alunosSelecionados]);

  // Restaura o último destino (professor + turma/horário) por professor+unidade,
  // validando as dependências após carregar as opções disponíveis.
  useEffect(() => {
    if (!aberto || !professorLogado || !tenantId) return;
    const saved = carregarPreferencia<PreferenciaDestino>(
      PREFERENCIA_TIPO,
      tenantId,
      professorLogado,
      { professorId: '', turmaGrupoId: '' },
    );
    if (!saved) return;
    const profExiste = professores.some((p) => p.id === saved.professorId);
    if (!profExiste) {
      setProfessorDestino('');
      setTurmaDestino('');
      setNivelDestino(null);
      return;
    }
    setProfessorDestino(saved.professorId);
    const turmasDoProf = turmas.filter((t) => t.professor_id === saved.professorId);
    const turmaExiste = turmasDoProf.some((t) => t.grupo_id === saved.turmaGrupoId);
    if (!turmaExiste) {
      setTurmaDestino('');
      setNivelDestino(null);
      return;
    }
    setTurmaDestino(saved.turmaGrupoId);
    const t = turmasDoProf.find((x) => x.grupo_id === saved.turmaGrupoId);
    setNivelDestino(t?.nivel || null);
  }, [aberto, professorLogado, tenantId, professores, turmas]);

  const handleProfessorChange = (value: string) => {
    setProfessorDestino(value);
    setTurmaDestino('');
    setNivelDestino(null);
    if (!tenantId || !professorLogado) return;
    salvarPreferencia(PREFERENCIA_TIPO, tenantId, professorLogado, {
      professorId: value,
      turmaGrupoId: '',
    });
  };

  const handleTurmaChange = (value: string) => {
    setTurmaDestino(value);
    const t = turmasDisponiveis.find((x) => x.grupo_id === value);
    setNivelDestino(t?.nivel || null);
    // A mudança de nível da turma é uma escolha explícita: ao trocar de turma
    // o controle volta ao estado inicial (desmarcado).
    setMudarNivelTurma(false);
    setNivelTurmaNovo(t?.nivel || '');
    if (!tenantId || !professorLogado) return;
    salvarPreferencia(PREFERENCIA_TIPO, tenantId, professorLogado, {
      professorId: professorDestino,
      turmaGrupoId: value,
    });
  };

  const handleSave = async () => {
    if (isVisitante) {
      setErro('Visitante não pode programar transferências');
      return;
    }
    if (!turmaDestino) {
      setErro('Selecione a turma de destino');
      return;
    }
    if (!dataEfetiva) {
      setErro('Informe a data efetiva');
      return;
    }
    if (dataEfetiva < hojeSaoPaulo()) {
      setErro('A data efetiva não pode ser no passado');
      return;
    }
    const semTurma = origens.filter((o) => !o.turma_origem);
    if (semTurma.length > 0) {
      setErro('Alunos sem matrícula vigente não podem ser transferidos');
      return;
    }
    if (mudarNivelTurma && !nivelTurmaNovo.trim()) {
      setErro('Informe o novo nível da turma de destino');
      return;
    }

    if (conflitos.length > 0) {
      setErro('Não é possível programar: alguns alunos já possuem transferência pendente. Resolva os conflitos abaixo.');
      return;
    }

    const itens: TransferenciaLoteItemInput[] = origens.map((o) => ({
      aluno_id: o.aluno_id,
      turma_destino: turmaDestino,
    }));

    const input: TransferenciaLoteCreateInput = {
      turma_destino: turmaDestino,
      nivel_destino: nivelDestino,
      professor_destino: professorDestino || undefined,
      data_efetiva: dataEfetiva,
      motivo: motivo || undefined,
      itens,
      mudar_nivel_turma: mudarNivelTurma || undefined,
      nivel_turma_novo: mudarNivelTurma ? nivelTurmaNovo.trim() : undefined,
    };

    setCarregando(true);
    setErro(null);
    try {
      await api.post('/transferencias-nivel/lotes', input);
      setSucesso(
        mudarNivelTurma
          ? `Lote programado. Os alunos serão transferidos e a turma de destino passa para o nível "${nivelTurmaNovo.trim()}" em ${dataEfetiva.split('-').reverse().join('/')}.`
          : 'Lote programado. Os alunos serão transferidos na data efetiva.',
      );
      onSucesso();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      const status = err?.response?.status;
      const detalhes = err?.response?.data?.detalhes;
      if (status === 409 && Array.isArray(detalhes?.conflitos)) {
        setConflitos(detalhes.conflitos as ConflitoAluno[]);
        setErro('Não é possível programar: alguns alunos já possuem transferência pendente (conflito detectado ao enviar). Resolva os conflitos abaixo.');
      } else {
        setErro(err?.response?.data?.error || 'Erro ao programar transferência');
      }
    } finally {
      setCarregando(false);
    }
  };

  /** Salva a programação atual na sessão e abre o Detalhes do lote pendente (atalho de resolução). */
  const abrirLotePendente = (loteId: string) => {
    if (!tenantId || !professorLogado) return;
    salvarProgramacaoPendente(tenantId, professorLogado, {
      alunoIds: alunosSelecionados.map((a) => a.id),
      professorDestino,
      turmaDestino,
      dataEfetiva,
      motivo,
      mudarNivelTurma,
      nivelTurmaNovo,
    });
    onClose();
    navigate(`/transferencias-nivel?aba=lotes&loteAberto=${encodeURIComponent(loteId)}`);
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Escolher destino da transferência
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Origem dos alunos selecionados ({alunosSelecionados.length})
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              A origem é a matrícula vigente de cada aluno e não pode ser alterada aqui.
            </p>
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400">Aluno</th>
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400">Turma de origem</th>
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400">Nível de origem</th>
                  </tr>
                </thead>
                <tbody>
                  {origens.map((o) => (
                    <tr key={o.aluno_id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-800 dark:text-gray-200">{o.aluno_nome}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{o.turma_origem || 'Sem turma'}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{o.nivel_origem || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Professor de destino
              </label>
              <select
                value={professorDestino}
                onChange={(e) => handleProfessorChange(e.target.value)}
                disabled={carregando}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">Escolha o professor</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome_documento || p.nome} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Turma / Horário de destino
              </label>
              <select
                value={turmaDestino}
                onChange={(e) => handleTurmaChange(e.target.value)}
                disabled={!professorDestino || carregando}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Escolha a turma</option>
                {turmasDisponiveis.map((t) => {
                  const prof = professores.find((p) => p.id === t.professor_id);
                  return (
                    <option key={t.grupo_id} value={t.grupo_id}>
                      {t.label} • {(t.horario || '').slice(0, 5)} {prof ? `— ${prof.nome_documento || prof.nome}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data efetiva
              </label>
              <input
                type="date"
                value={dataEfetiva}
                onChange={(e) => setDataEfetiva(e.target.value)}
                disabled={carregando}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Padrão: 1º dia do mês seguinte (America/Sao_Paulo)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nível de destino
              </label>
              <input
                type="text"
                value={nivelDestino || ''}
                readOnly
                placeholder="Definido pela turma de destino"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Vale somente para os alunos transferidos neste lote.
              </p>
            </div>
          </div>

          {turmaSelecionada && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mudarNivelTurma}
                  onChange={(e) => {
                    setMudarNivelTurma(e.target.checked);
                    if (e.target.checked && !nivelTurmaNovo) {
                      setNivelTurmaNovo(turmaSelecionada.nivel || '');
                    }
                  }}
                  disabled={carregando}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  Programar mudança de nível da turma
                </span>
              </label>

              {mudarNivelTurma && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Novo nível da turma
                    </label>
                    <input
                      type="text"
                      value={nivelTurmaNovo}
                      onChange={(e) => setNivelTurmaNovo(e.target.value)}
                      placeholder="Ex.: 3"
                      disabled={carregando}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <p>
                      Nível atual da turma: <strong>{turmaSelecionada.nivel || 'sem nível'}</strong> → novo nível:{' '}
                      <strong>{nivelTurmaNovo.trim() || '—'}</strong>
                    </p>
                    <p>
                      Vigência: <strong>{dataEfetiva ? dataEfetiva.split('-').reverse().join('/') : '—'}</strong>{' '}
                      (data efetiva do lote).
                    </p>
                    <p>
                      A mudança abrange <strong>toda a turma</strong>: os alunos que já estão nela e os que
                      chegam por esta transferência. Até a confirmação, o nível oficial continua vigente.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Lotação projetada da turma de destino
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lotação atual</p>
                <p className="font-mono font-medium text-gray-800 dark:text-gray-100">{projecao.lotacao_atual}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Saídas</p>
                <p className="font-mono font-medium text-red-600 dark:text-red-400">-{projecao.saidas}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entradas</p>
                <p className="font-mono font-medium text-green-600 dark:text-green-400">+{projecao.entradas}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Projetado</p>
                <p className="font-mono font-medium text-gray-800 dark:text-gray-100">
                  {projecao.projetado}
                  {projecao.capacidade !== null && (
                    <span className="text-gray-400 dark:text-gray-500">/{projecao.capacidade}</span>
                  )}
                </p>
              </div>
            </div>
            {projecao.vagas_restantes !== null && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {projecao.vagas_restantes >= 0
                  ? `Vagas após a aplicação: ${projecao.vagas_restantes}`
                  : `Excesso de ${Math.abs(projecao.vagas_restantes)} vaga(s) na turma de destino`}
              </p>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-red-800 dark:text-red-300 text-sm">{erro}</p>
              </div>
            </div>
          )}
          {conflitos.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                  Conflito de transferência pendente
                </p>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                Os seguintes alunos já possuem transferência programada e não podem ser incluídos neste lote:
              </p>
              <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
                {conflitos.map((c) => (
                  <li key={c.aluno_id} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-900/30">
                    <div className="flex-1">
                      <p className="text-amber-800 dark:text-amber-200 font-medium">{c.aluno_nome || c.aluno_id}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Destino já programado: <strong>{c.turma_destino}</strong> · efetiva{' '}
                        <strong>{c.data_efetiva.split('-').reverse().join('/')}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirLotePendente(c.lote_id)}
                      className="px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800/30 hover:underline"
                    >
                      Ver lote pendente
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
                Retire o(s) aluno(s) do lote correspondente pelo atalho acima ou cancele a programação atual.
              </p>
            </div>
          )}
          {sucesso && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <p className="text-green-800 dark:text-green-300 text-sm">{sucesso}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <CalendarClock size={14} />
            <span>
              Aplicação somente a partir de {dataEfetiva ? dataEfetiva.split('-').reverse().join('/') : '—'}
            </span>
            <ArrowRight size={12} />
            <span>mudança de turma e matrícula</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={carregando}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancelar programação
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                carregando ||
                verificandoConflitos ||
                conflitos.length > 0 ||
                !turmaDestino ||
                isVisitante
              }
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? <Loader2 size={16} className="mr-2 animate-spin" /> : ''}
              Programar transferência
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferenciaLoteReviewModal;
