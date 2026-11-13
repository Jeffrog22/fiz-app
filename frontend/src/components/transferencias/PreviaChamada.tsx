import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import type {
  Aluno,
  CalendarioEvento,
  ChamadaLog,
  Professor,
  TransferenciaNivelPendencia,
  Turma,
} from '../../types';
import DataGrid from '../grid/DataGrid';
import { gerarDiasLetivos } from '../../utils/chamadaUtils';
import { getTenantId } from '../../utils/tenant';
import {
  carregarPreferencia,
  salvarPreferencia,
} from '../../utils/transferenciaPreferencias';
import {
  comporTurma,
  horariosSequenciaProfessor,
  mesAnoDeData,
  nivelProjetadoPorTurma,
  sequenciaTurmasProfessor,
  type MovimentoTransferencia,
} from '../../utils/transferenciasUtils';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface PeriodoPreview {
  id?: string;
  aluno_id: string;
  turma_id?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  motivo?: string;
  nivel?: string;
}

interface PreviaChamadaProps {
  turmas: Turma[];
  professores: Professor[];
  alunosAtivos: Aluno[];
  movimentos: MovimentoTransferencia[];
  dataEfetivaBase?: string | null;
  pendenciasNivel?: TransferenciaNivelPendencia[];
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PreviaChamada: React.FC<PreviaChamadaProps> = ({
  turmas,
  professores,
  alunosAtivos,
  movimentos,
  dataEfetivaBase,
  pendenciasNivel = [],
}) => {
  const { professorId: professorLogado } = useAuth();
  const tenantId = getTenantId();
  const [professorId, setProfessorId] = useState('');
  const [turmaGrupoId, setTurmaGrupoId] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [competenciaManual, setCompetenciaManual] = useState(false);
  const [competencia, setCompetencia] = useState(() => mesAnoDeData(dataEfetivaBase || '') || { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
  const [logs, setLogs] = useState<Record<string, Record<string, Record<number, ChamadaLog>>>>({});
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [enrollmentPeriods, setEnrollmentPeriods] = useState<Record<string, PeriodoPreview[]>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Sequencia oficial: blocos de dias (LABEL_ORDER) e, dentro deles, horarios */
  const sequencia = useMemo(
    () => sequenciaTurmasProfessor(turmas, professorId),
    [turmas, professorId],
  );

  const horariosDisponiveis = useMemo(
    () => horariosSequenciaProfessor(turmas, professorId),
    [turmas, professorId],
  );

  const indiceSequencia = useMemo(
    () => sequencia.findIndex((t) => t.grupo_id === turmaGrupoId),
    [sequencia, turmaGrupoId],
  );

  const turmaSelecionada = useMemo(
    () => sequencia.find((t) => t.grupo_id === turmaGrupoId) || null,
    [sequencia, turmaGrupoId],
  );

  const indiceTurma = useMemo(() => {
    if (!turmaSelecionada) return 0;
    const irmas = turmas
      .filter((t) => t.label === turmaSelecionada.label && t.professor_id === turmaSelecionada.professor_id)
      .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
    return Math.max(irmas.findIndex((t) => t.grupo_id === turmaSelecionada.grupo_id), 0);
  }, [turmas, turmaSelecionada]);

  const nivelProjeto = useMemo(
    () => nivelProjetadoPorTurma(pendenciasNivel).get(turmaGrupoId),
    [pendenciasNivel, turmaGrupoId],
  );

  const dias = useMemo(
    () => (turmaSelecionada ? gerarDiasLetivos(competencia.mes, competencia.ano, turmaSelecionada.label) : []),
    [competencia, turmaSelecionada],
  );

  const composicao = useMemo(
    () =>
      turmaSelecionada
        ? comporTurma(turmaSelecionada.grupo_id || '', alunosAtivos, movimentos)
        : { alunos: [] as Aluno[], entradas: [] as Aluno[], saidas: [] as Aluno[] },
    [turmaSelecionada, alunosAtivos, movimentos],
  );

  const dataEfetivaEntrada = useMemo(() => {
    const doAluno = movimentos
      .filter((m) => m.turma_destino === turmaGrupoId)
      .map((m) => m.data_efetiva)
      .sort();
    return doAluno[0] || dataEfetivaBase || null;
  }, [movimentos, turmaGrupoId, dataEfetivaBase]);

  const carregar = useCallback(async () => {
    if (!turmaSelecionada || dias.length === 0) {
      setLogs({});
      setEnrollmentPeriods({});
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const inicio = dias[0];
      const fim = dias[dias.length - 1];
      const ids = composicao.alunos.map((a) => a.id);

      const [resLogs, resEventos, resEnrollment] = await Promise.all([
        api.get(`/chamadas/periodo?inicio=${inicio}&fim=${fim}`),
        api.get(`/calendario?mes=${competencia.mes}&ano=${competencia.ano}`),
        ids.length > 0
          ? api.get(`/alunos/enrollment?ids=${ids.join(',')}`)
          : Promise.resolve({ data: [] as PeriodoPreview[] }),
      ]);

      const indexados: Record<string, Record<string, Record<number, ChamadaLog>>> = {};
      for (const log of (resLogs.data || []) as ChamadaLog[]) {
        const key = log.grupo_id || 'unknown';
        if (!indexados[key]) indexados[key] = {};
        if (!indexados[key][log.data]) indexados[key][log.data] = {};
        indexados[key][log.data][log.indice_aula] = log;
      }
      setLogs(indexados);
      setEventos(resEventos.data || []);

      const periodos: Record<string, PeriodoPreview[]> = {};
      for (const p of (resEnrollment.data || []) as PeriodoPreview[]) {
        if (!periodos[p.aluno_id]) periodos[p.aluno_id] = [];
        periodos[p.aluno_id].push(p);
      }
      // Alunos que entram na turma passam a contar a partir da data efetiva
      if (dataEfetivaEntrada) {
        for (const aluno of composicao.entradas) {
          const lista = periodos[aluno.id] || [];
          const jaTemPeriodo = lista.some(
            (p) => p.turma_id === turmaSelecionada.grupo_id && (!p.data_fim || p.data_fim >= dataEfetivaEntrada),
          );
          if (!jaTemPeriodo) {
            lista.push({
              aluno_id: aluno.id,
              turma_id: turmaSelecionada.grupo_id,
              data_inicio: dataEfetivaEntrada,
              data_fim: null,
              motivo: 'transferencia',
            });
          }
          periodos[aluno.id] = lista;
        }
      }
      setEnrollmentPeriods(periodos);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar a prévia da chamada');
    } finally {
      setCarregando(false);
    }
  }, [turmaSelecionada, dias, composicao, competencia, dataEfetivaEntrada]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Restaura a última seleção Professor -> Turma + competência, isolada por
  // professor logado e unidade, validando as dependências após carregar as
  // opções disponíveis.
  useEffect(() => {
    if (!professorLogado || !tenantId) return;
    const saved = carregarPreferencia<{
      professorId: string;
      turmaGrupoId: string;
      competencia?: { mes: number; ano: number } | null;
    }>(
      'previa',
      tenantId,
      professorLogado,
      { professorId: '', turmaGrupoId: '', competencia: null },
    );
    if (!saved) return;
    const profExiste = professores.some((p) => p.id === saved.professorId);
    if (!profExiste) {
      setProfessorId('');
      setTurmaGrupoId('');
      return;
    }
    setProfessorId(saved.professorId);
    const turmasDoProf = turmas.filter((t) => t.professor_id === saved.professorId);
    const turmaExiste = turmasDoProf.some((t) => t.grupo_id === saved.turmaGrupoId);
    if (!turmaExiste) {
      setTurmaGrupoId('');
      return;
    }
    setTurmaGrupoId(saved.turmaGrupoId);
    if (saved.competencia && saved.competencia.mes && saved.competencia.ano) {
      setCompetencia(saved.competencia);
      setCompetenciaManual(true);
    }
  }, [professorLogado, tenantId, professores, turmas]);

  // Competência padrão = mês da data efetiva (enquanto o usuário não escolher outro)
  useEffect(() => {
    if (competenciaManual) return;
    const base = mesAnoDeData(dataEfetivaBase || '');
    if (base) setCompetencia(base);
  }, [dataEfetivaBase, competenciaManual]);

  const nomeProfessor = (id?: string) =>
    (id && (professores.find((p) => p.id === id)?.nome || '')) || '—';

  /** Seleciona uma turma da sequencia e sincroniza o filtro de horario */
  const selecionarTurma = useCallback(
    (grupoId: string, salvar = true) => {
      const alvo = sequencia.find((t) => t.grupo_id === grupoId);
      setTurmaGrupoId(grupoId);
      setHorarioSelecionado(alvo ? (alvo.horario || '').slice(0, 5) : '');
      if (!salvar || !tenantId || !professorLogado) return;
      salvarPreferencia('previa', tenantId, professorLogado, {
        professorId,
        turmaGrupoId: grupoId,
        competencia: competenciaManual ? competencia : null,
      });
    },
    [sequencia, professorId, competencia, competenciaManual, tenantId, professorLogado],
  );

  /** Navega para uma posicao da sequencia (usado pelos botoes Voltar/Proxima) */
  const irParaIndice = useCallback(
    (indice: number) => {
      if (indice < 0 || indice >= sequencia.length) return;
      const alvo = sequencia[indice];
      selecionarTurma(alvo.grupo_id || '');
    },
    [sequencia, selecionarTurma],
  );

  const podeVoltar = indiceSequencia > 0;
  const podeAvancar = indiceSequencia >= 0 && indiceSequencia < sequencia.length - 1;

  // Trocar de professor reposiciona na primeira turma da sequencia
  useEffect(() => {
    if (!professorId || sequencia.length === 0) return;
    const atual = sequencia.findIndex((t) => t.grupo_id === turmaGrupoId);
    if (atual >= 0) return;
    const primeira = sequencia[0];
    setTurmaGrupoId(primeira.grupo_id || '');
    setHorarioSelecionado((primeira.horario || '').slice(0, 5));
  }, [professorId, sequencia, turmaGrupoId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Professor</label>
          <select
            value={professorId}
            onChange={(e) => {
              const valor = e.target.value;
              setProfessorId(valor);
              setTurmaGrupoId('');
              setHorarioSelecionado('');
              if (!tenantId || !professorLogado) return;
              salvarPreferencia('previa', tenantId, professorLogado, {
                professorId: valor,
                turmaGrupoId: '',
                competencia: null,
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">Escolha o professor</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turma</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => irParaIndice(indiceSequencia - 1)}
              disabled={!podeVoltar}
              title="Turma anterior"
              className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <select
              value={turmaGrupoId}
              onChange={(e) => selecionarTurma(e.target.value)}
              disabled={!professorId}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Escolha a turma</option>
              {sequencia.map((t) => (
                <option key={t.grupo_id} value={t.grupo_id}>
                  {t.label} • {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => irParaIndice(indiceSequencia + 1)}
              disabled={!podeAvancar}
              title="Próxima turma"
              className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {sequencia.length > 0 && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              {indiceSequencia >= 0 ? indiceSequencia + 1 : 0} de {sequencia.length} turma(s) na ordem do grid oficial
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Horário</label>
          <select
            value={horarioSelecionado}
            onChange={(e) => {
              const valor = e.target.value;
              setHorarioSelecionado(valor);
              const indice = sequencia.findIndex((t) => (t.horario || '').slice(0, 5) === valor);
              if (indice >= 0) irParaIndice(indice);
            }}
            disabled={!professorId}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Todos os horários</option>
            {horariosDisponiveis.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mês da prévia</label>
          <select
            value={competencia.mes}
            onChange={(e) => {
              setCompetenciaManual(true);
              setCompetencia((c) => ({ ...c, mes: parseInt(e.target.value, 10) }));
              if (!tenantId || !professorLogado) return;
              salvarPreferencia('previa', tenantId, professorLogado, {
                professorId,
                turmaGrupoId,
                competencia: { mes: parseInt(e.target.value, 10), ano: competencia.ano },
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ano</label>
          <input
            type="number"
            value={competencia.ano}
            onChange={(e) => {
              setCompetenciaManual(true);
              setCompetencia((c) => ({ ...c, ano: parseInt(e.target.value, 10) || c.ano }));
              if (!tenantId || !professorLogado) return;
              salvarPreferencia('previa', tenantId, professorLogado, {
                professorId,
                turmaGrupoId,
                competencia: { mes: competencia.mes, ano: parseInt(e.target.value, 10) || competencia.ano },
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          />
        </div>
      </div>

      {!turmaSelecionada && (
        <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Escolha o professor e a turma para ver a prévia da chamada.
        </div>
      )}

      {turmaSelecionada && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-200 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium flex items-center gap-1">
              <Eye size={14} /> Prévia somente leitura
            </span>
            <span>
              Turma: <strong>{turmaSelecionada.label}</strong> · {(turmaSelecionada.horario || '').slice(0, 5)} · {nomeProfessor(turmaSelecionada.professor_id)}
            </span>
            <span>
              Competência: <strong>{MESES[competencia.mes - 1]}/{competencia.ano}</strong>
            </span>
            {dataEfetivaEntrada && (
              <span>
                Data efetiva: <strong>{dataEfetivaEntrada.split('-').reverse().join('/')}</strong>
              </span>
            )}
            <span>
              Composição projetada: <strong>{composicao.alunos.length}</strong> aluno(s)
            </span>
            {nivelProjeto && nivelProjeto.nivel && nivelProjeto.nivel !== turmaSelecionada.nivel ? (
              <span className="text-amber-800 dark:text-amber-300">
                Nível projetado da turma: <strong>{nivelProjeto.nivel}</strong> (atual: {turmaSelecionada.nivel || 'sem nível'})
                {nivelProjeto.dataEfetiva && (
                  <> · a partir de {nivelProjeto.dataEfetiva.split('-').reverse().join('/')}</>
                )}
              </span>
            ) : (
              <span>
                Nível da turma: <strong>{turmaSelecionada.nivel || 'sem nível'}</strong>
              </span>
            )}
          </div>

          {nivelProjeto?.conflito && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
              Há uma proposta conflitante de mudança de nível para esta turma e data. A aplicação do lote
              fica bloqueada até a revisão das propostas.
            </div>
          )}

          {(composicao.entradas.length > 0 || composicao.saidas.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 flex items-center gap-1 mb-1">
                  <ArrowDownLeft size={13} /> Entram na turma ({composicao.entradas.length})
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {composicao.entradas.map((a) => a.nome).join(', ') || '—'}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-800 dark:text-red-300 flex items-center gap-1 mb-1">
                  <ArrowUpRight size={13} /> Saem da turma ({composicao.saidas.length})
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {composicao.saidas.map((a) => a.nome).join(', ') || '—'}
                </p>
              </div>
            </div>
          )}

          {erro && (
            <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
          )}

          {carregando && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando prévia...</p>
          )}

          {!carregando && (
            <DataGrid
              alunos={composicao.alunos}
              dias={dias}
              logs={logs}
              indiceAtual={indiceTurma}
              turma={turmaSelecionada}
              turmaGrupoId={turmaSelecionada.grupo_id}
              eventos={eventos}
              enrollmentPeriods={enrollmentPeriods as any}
              onTogglePresenca={() => {}}
              onUpdateAnotacao={() => {}}
              onDateHeaderClick={() => {}}
              somenteLeitura
            />
          )}
        </>
      )}
    </div>
  );
};

export default PreviaChamada;
