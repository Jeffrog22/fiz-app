import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DataGrid from '../components/grid/DataGrid';
import ChamadaFilters from '../components/grid/ChamadaFilters';
import GridPagination from '../components/grid/GridPagination';
import CardAula from '../components/modals/CardAula';
import CardBO from '../components/modals/CardBO';
import type { Aluno, Turma, Professor, ChamadaLog, AnotacaoAluno, CalendarioEvento } from '../types';
import { gerarDiasLetivos, hojeMesAno, parseDiasFromLabel } from '../utils/chamadaUtils';

type PresencaStatus = 'presente' | 'falta' | 'justificado' | 'cancelado' | 'feriado' | 'ponte' | 'reuniao' | 'evento' | 'ferias' | 'fora_periodo' | undefined;

const MAX_UNDO = 20;

interface UndoAction {
  type: 'presenca' | 'anotacao' | 'limpar_dia' | 'limpar_tudo' | 'afastamento';
  alunoId?: string;
  data?: string;
  indice?: number;
  statusAntigo?: PresencaStatus;
  motivoAntigo?: string;
  batch?: Array<{ alunoId: string; statusAntigo?: PresencaStatus; statuses?: Record<string, PresencaStatus> }>;
}

function getSessionState(key: string, fallback: string): string {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) return stored;
  } catch { /* ignore */ }
  return fallback;
}
function getSessionNumber(key: string, fallback: number): number {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) return Number(stored);
  } catch { /* ignore */ }
  return fallback;
}

const Chamadas: React.FC = () => {
  const navigate = useNavigate();
  const { mes: mesInicial, ano: anoInicial } = hojeMesAno();

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [logs, setLogs] = useState<Record<string, Record<string, Record<number, ChamadaLog>>>>({});
  const [carregando, setCarregando] = useState(true);
  const [statusSave, setStatusSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [mes, setMes] = useState(getSessionNumber('chamadas_mes', mesInicial));
  const [ano, setAno] = useState(getSessionNumber('chamadas_ano', anoInicial));
  const [retroativo, setRetroativo] = useState(false);
  const [labelSelecionada, setLabelSelecionada] = useState(getSessionState('chamadas_label', ''));
  const [professorId, setProfessorId] = useState(getSessionState('chamadas_professorId', ''));

  const [indiceAtual, setIndiceAtual] = useState(getSessionNumber('chamadas_indice', 0));
  const isInitialMount = useRef(true);

  const [cardAulaAberto, setCardAulaAberto] = useState(false);
  const [cardBOAberto, setCardBOAberto] = useState(false);
  const [dateHeaderClickData, setDateHeaderClickData] = useState<string>('');
  const [alunosComAnotacao, setAlunosComAnotacao] = useState<Set<string>>(new Set());
  const [alunosComAtestadoAnotacao, setAlunosComAtestadoAnotacao] = useState<Set<string>>(new Set());
  const [cardAulaData, setCardAulaData] = useState<Record<string, Record<number, any>>>({});
  const [enrollmentPeriods, setEnrollmentPeriods] = useState<Record<string, any[]>>({});

  const [limparConfirm, setLimparConfirm] = useState(false);
  const [limparModo, setLimparModo] = useState<'dia' | 'tudo'>('dia');
  const [limparDropdownOpen, setLimparDropdownOpen] = useState(false);
  const [undoCount, setUndoCount] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filaSalvamento = useRef<any[]>([]);
  const undoStack = useRef<UndoAction[]>([]);

  const statusSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const atestadoProximoVencer = useCallback((aluno: Aluno): boolean => {
    if (!aluno.atestado_medico || !aluno.data_atestado) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(aluno.data_atestado);
    vencimento.setHours(0, 0, 0, 0);
    const diff = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 60;
  }, []);

  const diasRestantes = useCallback((dataAtestado: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataAtestado);
    vencimento.setHours(0, 0, 0, 0);
    return Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  const turmasDoLabelProf = useMemo(() => {
    if (!labelSelecionada || !professorId) return [];
    return turmas
      .filter((t) => t.label === labelSelecionada && t.professor_id === professorId)
      .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
  }, [labelSelecionada, professorId, turmas]);

  const totalIndices = turmasDoLabelProf.length;
  const turmaAtual = turmasDoLabelProf[indiceAtual] || null;
  const grupoId = turmaAtual?.grupo_id || '';
  const horario = turmaAtual?.horario || '';
  const nivel = turmaAtual?.nivel || '';

  const horariosDisponiveis = useMemo(() => {
    return turmasDoLabelProf.map((t) => t.horario).filter(Boolean) as string[];
  }, [turmasDoLabelProf]);

  const dias = useMemo(
    () => gerarDiasLetivos(mes, ano, labelSelecionada),
    [mes, ano, labelSelecionada],
  );

  const alunosDaTurma = useMemo(() => {
    if (!grupoId) return [];
    return alunos.filter((a) => a.turma_id === grupoId);
  }, [alunos, grupoId]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resAlunos, resTurmas, resProfs, resEventos] = await Promise.all([
        api.get('/alunos?ativo=true'),
        api.get('/turmas'),
        api.get('/professores'),
        api.get(`/calendario?mes=${mes}&ano=${ano}`),
      ]);
      setAlunos(resAlunos.data);
      setTurmas(resTurmas.data);
      setProfessores(resProfs.data);
      setEventos(resEventos.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setCarregando(false);
    }
  }, [mes, ano, labelSelecionada, professorId]);

  const carregarLogs = useCallback(async () => {
    if (dias.length === 0) return;
    try {
      const inicio = dias[0];
      const fim = dias[dias.length - 1];
      const res = await api.get(`/chamadas/periodo?inicio=${inicio}&fim=${fim}&_t=${Date.now()}`);
      const raw: ChamadaLog[] = res.data;
      const indexed: Record<string, Record<string, Record<number, ChamadaLog>>> = {};
      for (const log of raw) {
        const key = log.grupo_id || 'unknown';
        if (!indexed[key]) indexed[key] = {};
        if (!indexed[key][log.data]) indexed[key][log.data] = {};
        indexed[key][log.data][log.indice_aula] = log;
      }
      setLogs((prev) => {
        const merged = { ...prev };
        for (const [grupoId, datas] of Object.entries(indexed)) {
          if (!merged[grupoId]) merged[grupoId] = {};
          for (const [data, indices] of Object.entries(datas)) {
            if (!merged[grupoId][data]) merged[grupoId][data] = {};
            for (const [indice, log] of Object.entries(indices)) {
              const idx = Number(indice);
              const localLog = merged[grupoId][data][idx];
              if (!localLog || localLog.origem !== 'manual') {
                merged[grupoId][data][idx] = log;
              }
            }
          }
        }
        return merged;
      });
    } catch (err) {
      console.error('Erro ao carregar chamadas', err);
    }
  }, [dias, professorId, indiceAtual]);

  const aplicarEventosCalendario = useCallback(async () => {
    if (eventos.length === 0) return;
    for (const ev of eventos) {
      if (dias.includes(ev.data)) {
        try {
          await api.post('/chamadas/aplicar-evento', { data: ev.data, tipo: ev.tipo });
        } catch {
          // evento ja pode ter sido aplicado
        }
      }
    }
    carregarLogs();
  }, [eventos, dias, carregarLogs]);

  const carregarAnotacoes = useCallback(async () => {
    const ids = alunosDaTurma.map((a) => a.id);
    if (ids.length === 0) { setAlunosComAnotacao(new Set()); return; }
    try {
      const res = await api.get(`/anotacoes/lote?ids=${ids.join(',')}`);
      const data: AnotacaoAluno[] = res.data || [];
      const alunosComAnot = new Set(data.map((a) => a.aluno_id));
      const alunosComAtestado = new Set(
        data.filter((a) => a.anotacao.startsWith('[Atestado]')).map((a) => a.aluno_id)
      );
      setAlunosComAnotacao(alunosComAnot);
      setAlunosComAtestadoAnotacao(alunosComAtestado);
    } catch (err) {
      console.error('Erro ao carregar anotacoes', err);
    }
  }, [alunosDaTurma]);

  const carregarEnrollmentPeriods = useCallback(async () => {
    if (alunosDaTurma.length === 0) {
      setEnrollmentPeriods({});
      return;
    }
    const ids = alunosDaTurma.map((a) => a.id).join(',');
    try {
      const res = await api.get(`/alunos/enrollment?ids=${ids}`);
      const data = res.data || [];
      const grouped: Record<string, any[]> = {};
      for (const ep of data) {
        if (!grouped[ep.aluno_id]) grouped[ep.aluno_id] = [];
        grouped[ep.aluno_id].push(ep);
      }
      setEnrollmentPeriods(grouped);
    } catch (err) {
      console.error('Erro ao carregar enrollment periods', err);
      setEnrollmentPeriods({});
    }
  }, [alunosDaTurma]);

  const carregarCardAulaData = useCallback(async () => {
    if (dias.length === 0) return;
    const map: Record<string, Record<number, any>> = {};
    const promises = dias.map(async (dia) => {
      try {
        const res = await api.get(`/chamadas/card-aula/daily/${dia}?_t=${Date.now()}`);
        if (Array.isArray(res.data)) {
          const diaMap: Record<number, any> = {};
          for (const rec of res.data) {
            if (rec.indice_aula != null) {
              diaMap[rec.indice_aula] = rec;
            }
          }
          if (Object.keys(diaMap).length > 0) {
            map[dia] = diaMap;
          }
        }
      } catch {
        // card_aula nao existe para este dia
      }
    });
    await Promise.all(promises);
    setCardAulaData(map);
  }, [dias]);

  useEffect(() => { carregarDados(); }, [carregarDados, labelSelecionada, professorId]);
  useEffect(() => { carregarLogs(); }, [carregarLogs]);
  useEffect(() => { aplicarEventosCalendario(); }, [aplicarEventosCalendario]);
  useEffect(() => { carregarAnotacoes(); }, [carregarAnotacoes]);
  useEffect(() => { carregarEnrollmentPeriods(); }, [carregarEnrollmentPeriods]);
  useEffect(() => { carregarCardAulaData(); }, [carregarCardAulaData]);
  useEffect(() => { carregarCardAulaData(); }, [indiceAtual]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) { carregarDados(); carregarLogs(); } };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [carregarDados, carregarLogs]);

  useEffect(() => {
    try {
      sessionStorage.setItem('chamadas_label', labelSelecionada);
      sessionStorage.setItem('chamadas_professorId', professorId);
      sessionStorage.setItem('chamadas_indice', String(indiceAtual));
      sessionStorage.setItem('chamadas_mes', String(mes));
      sessionStorage.setItem('chamadas_ano', String(ano));
    } catch { /* quota exceeded, ignore */ }
  }, [labelSelecionada, professorId, indiceAtual, mes, ano]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setIndiceAtual(0);
  }, [labelSelecionada, professorId]);

  useEffect(() => {
    if (indiceAtual >= totalIndices && totalIndices > 0) {
      setIndiceAtual(totalIndices - 1);
    }
  }, [totalIndices, indiceAtual]);

  useEffect(() => {
    if (statusSave === 'saved') {
      if (statusSaveTimerRef.current) clearTimeout(statusSaveTimerRef.current);
      statusSaveTimerRef.current = setTimeout(() => setStatusSave('idle'), 3000);
    }
    return () => {
      if (statusSaveTimerRef.current) clearTimeout(statusSaveTimerRef.current);
    };
  }, [statusSave]);

  const limparFiltros = () => {
    setLabelSelecionada('');
    setProfessorId('');
    setRetroativo(false);
    const hoje = hojeMesAno();
    setMes(hoje.mes);
    setAno(hoje.ano);
    try {
      sessionStorage.removeItem('chamadas_label');
      sessionStorage.removeItem('chamadas_professorId');
      sessionStorage.removeItem('chamadas_indice');
      sessionStorage.removeItem('chamadas_mes');
      sessionStorage.removeItem('chamadas_ano');
    } catch { /* ignore */ }
  };

  const processarFila = useCallback(async () => {
    if (filaSalvamento.current.length === 0) return;
    setStatusSave('saving');
    const unique = new Map<string, any>();
    for (const r of filaSalvamento.current) {
      const key = `${r.data}|${r.grupo_id}|${r.indice_aula}`;
      unique.set(key, r);
    }
    const payload = Array.from(unique.values());
    filaSalvamento.current = [];
    try {
      const res = await api.post('/chamadas', payload);
      if (res.data.ok) {
        setStatusSave('saved');
      }
    } catch (err: any) {
      console.error('[processarFila] Erro ao salvar chamadas:', err?.response?.data || err?.message || err);
      setStatusSave('error');
    }
  }, []);

  const agendarSalvamento = useCallback((payload: any[]) => {
    filaSalvamento.current.push(...payload);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(processarFila, 1000);
  }, [processarFila]);

  const handleTogglePresenca = useCallback(
    (alunoId: string, data: string, status: PresencaStatus) => {
      const hoje = new Date().toISOString().split('T')[0];
      if (!retroativo && data < hoje) return;

      const currentStatus = logs[alunoId]?.[data]?.[indiceAtual]?.status;
      undoStack.current.push({ type: 'presenca', alunoId, data, indice: indiceAtual, statusAntigo: currentStatus });
      if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
      setUndoCount((c) => c + 1);

      const payload = [{
        grupo_id: alunoId, data, indice_aula: indiceAtual,
        status: status || null, origem: 'manual',
      }];

      setLogs((prev) => {
        const next = { ...prev };
        if (!next[alunoId]) next[alunoId] = {};
        if (!next[alunoId][data]) next[alunoId][data] = {};
        if (status) {
          next[alunoId][data][indiceAtual] = {
            ...(next[alunoId][data][indiceAtual] || {}),
            id: '', tenant_id: '', data, grupo_id: alunoId,
            indice_aula: indiceAtual, status, origem: 'manual',
            criado_em: new Date().toISOString(),
          } as ChamadaLog;
        } else {
          delete next[alunoId][data][indiceAtual];
          if (Object.keys(next[alunoId][data]).length === 0) delete next[alunoId][data];
        }
        return next;
      });
      agendarSalvamento(payload);
    },
    [indiceAtual, agendarSalvamento, logs, retroativo, dias],
  );

  const handleUpdateAnotacao = useCallback(
    (alunoId: string, data: string, anotacao: string) => {
      const motivoAntigo = logs[alunoId]?.[data]?.[indiceAtual]?.motivo;
      undoStack.current.push({ type: 'anotacao', alunoId, data, indice: indiceAtual, motivoAntigo });
      if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
      setUndoCount((c) => c + 1);

      const payload = [{
        grupo_id: alunoId, data, indice_aula: indiceAtual,
        motivo: anotacao || null, origem: 'manual',
      }];
      setLogs((prev) => {
        const next = { ...prev };
        if (!next[alunoId]) next[alunoId] = {};
        if (!next[alunoId][data]) next[alunoId][data] = {};
        next[alunoId][data][indiceAtual] = { ...next[alunoId][data][indiceAtual], motivo: anotacao } as ChamadaLog;
        return next;
      });
      agendarSalvamento(payload);
    },
    [indiceAtual, agendarSalvamento, logs],
  );

  const handleDateHeaderClick = useCallback((data: string) => {
    setDateHeaderClickData(data);
  }, []);

  const handleDateHeaderDoubleClick = useCallback((data: string) => {
    setDateHeaderClickData(data);
    setCardAulaAberto(true);
  }, []);

  const handleAnotacaoChange = useCallback((_alunoId: string) => {
    carregarAnotacoes();
  }, [carregarAnotacoes]);

  const aplicarAfastamento = useCallback(
    (alunoId: string, dataInicial: string, dias: number, motivo?: string) => {
      if (!labelSelecionada || !professorId) return;
      const diasSemana = parseDiasFromLabel(labelSelecionada);
      if (diasSemana.length === 0 || dias < 1) return;

      const inicio = new Date(dataInicial + 'T12:00');
      inicio.setHours(0, 0, 0, 0);
      const dates: string[] = [];
      const statuses: Record<string, PresencaStatus> = {};

      for (let i = 0; i < dias; i++) {
        const data = new Date(inicio);
        data.setDate(data.getDate() + i);
        const diaSemana = data.getDay();
        if (diasSemana.includes(diaSemana)) {
          const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
          dates.push(dataStr);
          statuses[dataStr] = logs[alunoId]?.[dataStr]?.[indiceAtual]?.status;
        }
      }

      if (dates.length === 0) return;

      undoStack.current.push({ type: 'afastamento', alunoId, indice: indiceAtual, batch: [{ alunoId, statuses }] });
      if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
      setUndoCount((c) => c + 1);

      const payload = dates.map((data) => ({
        grupo_id: alunoId, data,
        indice_aula: indiceAtual,
        status: 'justificado', motivo: motivo || null, origem: 'manual',
      }));

      setLogs((prev) => {
        const next = { ...prev };
        for (const data of dates) {
          if (!next[alunoId]) next[alunoId] = {};
          if (!next[alunoId][data]) next[alunoId][data] = {};
          next[alunoId][data][indiceAtual] = {
            id: '', tenant_id: '', data, grupo_id: alunoId,
            indice_aula: indiceAtual,
            status: 'justificado', motivo: motivo || undefined, origem: 'manual',
            criado_em: new Date().toISOString(),
          } as ChamadaLog;
        }
        return next;
      });

      agendarSalvamento(payload);
    },
    [labelSelecionada, professorId, indiceAtual, logs, agendarSalvamento],
  );

  const handleSaveJustificativa = useCallback(
    (alunoId: string, data: string, motivo: string, dias?: number) => {
      const payload = [{
        grupo_id: alunoId, data, indice_aula: indiceAtual,
        status: 'justificado', motivo: motivo || null, origem: 'manual',
      }];
      setLogs((prev) => {
        const next = { ...prev };
        if (!next[alunoId]) next[alunoId] = {};
        if (!next[alunoId][data]) next[alunoId][data] = {};
        next[alunoId][data][indiceAtual] = {
          ...next[alunoId][data][indiceAtual],
          id: next[alunoId][data][indiceAtual]?.id || '',
          tenant_id: next[alunoId][data][indiceAtual]?.tenant_id || '',
          data, grupo_id: alunoId,
          indice_aula: indiceAtual,
          status: 'justificado', motivo,
          origem: 'manual',
          criado_em: next[alunoId][data][indiceAtual]?.criado_em || new Date().toISOString(),
        } as ChamadaLog;
        return next;
      });
      agendarSalvamento(payload);

      if (dias && dias >= 1 && motivo === 'Atestado') {
        aplicarAfastamento(alunoId, data, dias, 'Atestado');
      }
    },
    [indiceAtual, agendarSalvamento, aplicarAfastamento],
  );

  const handleLimparJustificativa = useCallback((alunoId: string, data: string) => {
    const logAtual = logs[alunoId]?.[data]?.[indiceAtual];
    if (logAtual?.status !== 'justificado') return;

    undoStack.current.push({
      type: 'presenca', alunoId, data, indice: indiceAtual, statusAntigo: 'justificado' as PresencaStatus,
    });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setUndoCount((c) => c + 1);

    setLogs((prev) => {
      const next = { ...prev };
      if (next[alunoId]?.[data]?.[indiceAtual]) {
        delete next[alunoId][data][indiceAtual];
        if (Object.keys(next[alunoId][data]).length === 0) {
          delete next[alunoId][data];
        }
      }
      return next;
    });

    agendarSalvamento([{
      grupo_id: alunoId, data, indice_aula: indiceAtual,
      status: null, origem: 'manual',
    }]);
  }, [logs, indiceAtual, agendarSalvamento]);

  const handleNomeDoubleClick = useCallback((aluno: Aluno) => {
    navigate(`/alunos?search=${encodeURIComponent(aluno.nome)}`);
  }, [navigate]);

  const handleDesfazer = useCallback(() => {
    const action = undoStack.current.pop();
    if (!action) return;
    setUndoCount((c) => c + 1);

    switch (action.type) {
      case 'presenca': {
        if (!action.alunoId || !action.data) return;
        const idx = action.indice ?? indiceAtual;
        const payload = [{
          grupo_id: action.alunoId, data: action.data,
          indice_aula: idx,
          status: action.statusAntigo || null, origem: 'manual',
        }];
        setLogs((prev) => {
          const next = { ...prev };
          if (!next[action.alunoId!]) next[action.alunoId!] = {};
          if (!next[action.alunoId!][action.data!]) next[action.alunoId!][action.data!] = {};
          if (action.statusAntigo) {
            next[action.alunoId!][action.data!][idx] = {
              id: '', tenant_id: '', data: action.data!, grupo_id: action.alunoId!,
              indice_aula: idx, status: action.statusAntigo, origem: 'manual',
              criado_em: new Date().toISOString(),
            };
          } else {
            delete next[action.alunoId!][action.data!][idx];
            if (Object.keys(next[action.alunoId!][action.data!]).length === 0) {
              delete next[action.alunoId!][action.data!];
            }
          }
          return next;
        });
        agendarSalvamento(payload);
        break;
      }
      case 'anotacao': {
        if (!action.alunoId || !action.data) return;
        const idx = action.indice ?? indiceAtual;
        const payload = [{
          grupo_id: action.alunoId, data: action.data,
          indice_aula: idx,
          motivo: action.motivoAntigo || null, origem: 'manual',
        }];
        setLogs((prev) => {
          const next = { ...prev };
          if (!next[action.alunoId!]) next[action.alunoId!] = {};
          if (!next[action.alunoId!][action.data!]) next[action.alunoId!][action.data!] = {};
          next[action.alunoId!][action.data!][idx] = {
            ...next[action.alunoId!][action.data!][idx],
            motivo: action.motivoAntigo,
          } as ChamadaLog;
          return next;
        });
        agendarSalvamento(payload);
        break;
      }
      case 'limpar_dia': {
        if (!action.batch || !action.data) return;
        const idx = action.indice ?? indiceAtual;
        const payload = action.batch.map((b) => ({
          grupo_id: b.alunoId, data: action.data,
          indice_aula: idx,
          status: b.statusAntigo || null, origem: 'manual',
        }));
        setLogs((prev) => {
          const next = { ...prev };
          for (const b of action.batch!) {
            if (!next[b.alunoId]) next[b.alunoId] = {};
            if (!next[b.alunoId][action.data!]) next[b.alunoId][action.data!] = {};
            if (b.statusAntigo) {
              next[b.alunoId][action.data!][idx] = {
                id: '', tenant_id: '', data: action.data!, grupo_id: b.alunoId,
                indice_aula: idx, status: b.statusAntigo, origem: 'manual',
                criado_em: new Date().toISOString(),
              };
            } else {
              delete next[b.alunoId][action.data!][idx];
              if (Object.keys(next[b.alunoId][action.data!]).length === 0) {
                delete next[b.alunoId][action.data!];
              }
            }
          }
          return next;
        });
        agendarSalvamento(payload);
        break;
      }
      case 'limpar_tudo': {
        if (!action.batch) return;
        const idx = action.indice ?? indiceAtual;
        const payload: any[] = [];
        for (const b of action.batch) {
          if (!b.statuses) continue;
          for (const [data, status] of Object.entries(b.statuses)) {
            payload.push({
              grupo_id: b.alunoId, data,
              indice_aula: idx,
              status: status || null, origem: 'manual',
            });
          }
        }
        setLogs((prev) => {
          const next = { ...prev };
          for (const b of action.batch!) {
            if (!b.statuses) continue;
            for (const [data, statusAntigo] of Object.entries(b.statuses)) {
              if (!next[b.alunoId]) next[b.alunoId] = {};
              if (!next[b.alunoId][data]) next[b.alunoId][data] = {};
              if (statusAntigo) {
                next[b.alunoId][data][idx] = {
                  id: '', tenant_id: '', data, grupo_id: b.alunoId,
                  indice_aula: idx, status: statusAntigo, origem: 'manual',
                  criado_em: new Date().toISOString(),
                };
              } else {
                delete next[b.alunoId][data][idx];
                if (Object.keys(next[b.alunoId][data]).length === 0) {
                  delete next[b.alunoId][data];
                }
              }
            }
          }
          return next;
        });
        agendarSalvamento(payload);
        break;
      }
      case 'afastamento': {
        if (!action.alunoId || !action.batch) return;
        const idx = action.indice ?? indiceAtual;
        const payload: any[] = [];
        for (const b of action.batch) {
          if (!b.statuses) continue;
          for (const [data, status] of Object.entries(b.statuses)) {
            payload.push({
              grupo_id: action.alunoId, data,
              indice_aula: idx,
              status: status || null, origem: 'manual',
            });
          }
        }
        setLogs((prev) => {
          const next = { ...prev };
          for (const b of action.batch!) {
            if (!b.statuses) continue;
            for (const [data, statusAntigo] of Object.entries(b.statuses)) {
              if (!next[action.alunoId!]) next[action.alunoId!] = {};
              if (!next[action.alunoId!][data]) next[action.alunoId!][data] = {};
              if (statusAntigo) {
                next[action.alunoId!][data][idx] = {
                  id: '', tenant_id: '', data, grupo_id: action.alunoId!,
                  indice_aula: idx, status: statusAntigo, origem: 'manual',
                  criado_em: new Date().toISOString(),
                };
              } else {
                delete next[action.alunoId!][data][idx];
                if (Object.keys(next[action.alunoId!][data]).length === 0) {
                  delete next[action.alunoId!][data];
                }
              }
            }
          }
          return next;
        });
        agendarSalvamento(payload);
        break;
      }
    }
  }, [indiceAtual, agendarSalvamento]);

  const handleAfastamento = useCallback((alunoId: string, dias: number) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    aplicarAfastamento(alunoId, hojeStr, dias);
  }, [aplicarAfastamento]);

  const handleLimparDia = useCallback(async () => {
    if (alunosDaTurma.length === 0 || dias.length === 0) return;
    const data = dateHeaderClickData || dias[0];
    const batch = alunosDaTurma.map((a) => ({
      alunoId: a.id,
      statusAntigo: logs[a.id]?.[data]?.[indiceAtual]?.status,
    }));
    undoStack.current.push({ type: 'limpar_dia', data, indice: indiceAtual, batch });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setUndoCount((c) => c + 1);

    const payload = batch.map((b) => ({
      grupo_id: b.alunoId, data,
      indice_aula: indiceAtual,
      status: null, origem: 'manual',
    }));
    setLogs((prev) => {
      const next = { ...prev };
      for (const b of batch) {
        if (next[b.alunoId]?.[data]?.[indiceAtual]) {
          delete next[b.alunoId][data][indiceAtual];
          if (Object.keys(next[b.alunoId][data]).length === 0) {
            delete next[b.alunoId][data];
          }
        }
      }
      return next;
    });
    filaSalvamento.current.push(...payload);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await processarFila();
    await carregarLogs();
    setLimparConfirm(false);
  }, [alunosDaTurma, dias, dateHeaderClickData, indiceAtual, logs, processarFila, carregarLogs]);

  const handleLimparTudo = useCallback(async () => {
    if (alunosDaTurma.length === 0 || dias.length === 0) return;
    const batch = alunosDaTurma.map((a) => {
      const statuses: Record<string, PresencaStatus> = {};
      for (const d of dias) {
        statuses[d] = logs[a.id]?.[d]?.[indiceAtual]?.status;
      }
      return { alunoId: a.id, statuses };
    });
    undoStack.current.push({ type: 'limpar_tudo', indice: indiceAtual, batch });
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    setUndoCount((c) => c + 1);

    const payload: any[] = [];
    for (const b of batch) {
      for (const d of dias) {
        payload.push({
          grupo_id: b.alunoId, data: d,
          indice_aula: indiceAtual,
          status: null, origem: 'manual',
        });
      }
    }
    setLogs((prev) => {
      const next = { ...prev };
      for (const b of batch) {
        for (const d of dias) {
          if (next[b.alunoId]?.[d]?.[indiceAtual]) {
            delete next[b.alunoId][d][indiceAtual];
            if (Object.keys(next[b.alunoId][d]).length === 0) {
              delete next[b.alunoId][d];
            }
          }
        }
      }
      return next;
    });
    filaSalvamento.current.push(...payload);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await processarFila();
    await carregarLogs();
    setLimparConfirm(false);
  }, [alunosDaTurma, dias, indiceAtual, logs, processarFila, carregarLogs]);

  useEffect(() => {
    if (!limparDropdownOpen) return;
    const timer = setTimeout(() => {
      const close = () => setLimparDropdownOpen(false);
      window.addEventListener('click', close, { once: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [limparDropdownOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (filaSalvamento.current.length > 0) processarFila();
    };
  }, [processarFila]);

  const podeDesfazer = undoStack.current.length > 0;

  const indicadorSave = () => {
    switch (statusSave) {
      case 'saving':
        return <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse dark:bg-gray-500" />Salvando...</span>;
      case 'saved':
        return <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"><span className="w-2 h-2 bg-green-500 rounded-full dark:bg-green-400" />Salvo</span>;
      case 'error':
        return <span className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400"><span className="w-2 h-2 bg-red-500 rounded-full dark:bg-red-400" />Erro ao salvar</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Chamadas</h1>
        <div className="flex items-center gap-2 min-w-[120px] justify-end">
          {indicadorSave()}
        </div>
      </div>

      <ChamadaFilters
        label={labelSelecionada}
        professorId={professorId}
        horario={horario}
        nivel={nivel}
        mes={mes}
        ano={ano}
        turmas={turmas}
        professores={professores}
        retroativo={retroativo}
        onLabelChange={setLabelSelecionada}
        onProfessorChange={setProfessorId}
        onHorarioChange={(v) => {
          const idx = turmasDoLabelProf.findIndex((t) => t.horario === v);
          if (idx >= 0) setIndiceAtual(idx);
        }}
        onMesChange={setMes}
        onAnoChange={setAno}
        onRetroativoChange={setRetroativo}
        onLimpar={limparFiltros}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <GridPagination
          indiceAtual={indiceAtual}
          totalIndices={totalIndices}
          grupoId={grupoId}
          onAnterior={() => setIndiceAtual((i) => Math.max(0, i - 1))}
          onProximo={() => setIndiceAtual((i) => Math.min(totalIndices - 1, i + 1))}
        />

        <div className="flex gap-1 ml-auto">
          <button onClick={handleDesfazer} disabled={!podeDesfazer}
            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 border border-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:border-gray-700">
            Desfazer
          </button>
          {alunosDaTurma.length > 0 && (
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setLimparDropdownOpen(v => !v); }}
                className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200 transition dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 dark:border-red-800">
                Limpar ▾
              </button>
              {limparDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border z-50 dark:bg-gray-800 dark:border-gray-700 py-1 min-w-[180px]">
                  <button
                    onClick={() => { setLimparDropdownOpen(false); setLimparModo('dia'); setLimparConfirm(true); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    🗓️ Limpar este dia
                  </button>
                  <button
                    onClick={() => { setLimparDropdownOpen(false); setLimparModo('tudo'); setLimparConfirm(true); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    🧹 Limpar tudo
                  </button>
                </div>
              )}
            </div>
          )}
          <button onClick={() => { if (!dateHeaderClickData) setDateHeaderClickData(dias[0] || ''); setCardAulaAberto(true); }} disabled={!grupoId}
            className="px-3 py-1.5 text-xs bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 border border-cyan-200 transition disabled:opacity-30 disabled:cursor-not-allowed dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50 dark:border-cyan-800">
            Card Aula
          </button>
          <button onClick={() => { if (!dateHeaderClickData) setDateHeaderClickData(dias[0] || ''); setCardBOAberto(true); }} disabled={!grupoId}
            className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 border border-orange-200 transition disabled:opacity-30 disabled:cursor-not-allowed dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 dark:border-orange-800">
            Card BO
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      ) : !labelSelecionada ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500">
          Selecione uma turma para visualizar a chamada
        </div>
      ) : !professorId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500">
          Selecione um professor
        </div>
      ) : totalIndices === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500">
          Nenhuma turma encontrada para esta combinação
        </div>
      ) : dias.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500">
          Nenhum dia letivo encontrado para esta turma no período selecionado
        </div>
      ) : (
        <DataGrid
          alunos={alunosDaTurma}
          dias={dias}
          logs={logs}
          indiceAtual={indiceAtual}
          turma={turmaAtual}
          eventos={eventos}
          cardAulaData={cardAulaData}
          turmaGrupoId={grupoId}
          enrollmentPeriods={enrollmentPeriods}
          onTogglePresenca={handleTogglePresenca}
          onUpdateAnotacao={handleUpdateAnotacao}
          onDateHeaderClick={handleDateHeaderClick}
          onDateHeaderDoubleClick={handleDateHeaderDoubleClick}
          selectedDate={dateHeaderClickData}
          alunosComAnotacao={alunosComAnotacao}
          alunosComAtestadoAnotacao={alunosComAtestadoAnotacao}
          onAnotacaoChange={handleAnotacaoChange}
          onSaveJustificativa={handleSaveJustificativa}
          onClearJustificativa={handleLimparJustificativa}
          onNomeDoubleClick={handleNomeDoubleClick}
          onAfastamento={handleAfastamento}
        />
      )}

      {limparConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 dark:bg-black/60"
          onClick={() => setLimparConfirm(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl m-4 dark:bg-gray-800 dark:shadow-black/20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2 dark:text-gray-100">
              {limparModo === 'tudo' ? '🧹 Limpar tudo' : '🗓️ Limpar este dia'}
            </h3>
            <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
              {limparModo === 'tudo' ? (
                <>Deseja limpar todas as presenças de <strong>{alunosDaTurma.length} alunos</strong> em <strong>{dias.length} dias</strong> no índice de aula <strong>{indiceAtual + 1}</strong>?</>
              ) : (
                <>Deseja limpar as presenças de <strong>{alunosDaTurma.length} alunos</strong> no dia <strong>{new Date((dateHeaderClickData || dias[0]) + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> (índice <strong>{indiceAtual + 1}</strong>)?</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLimparConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={limparModo === 'tudo' ? handleLimparTudo : handleLimparDia}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">Limpar</button>
            </div>
          </div>
        </div>
      )}

      <CardAula
        aberto={cardAulaAberto}
        onClose={async () => {
          setCardAulaAberto(false);
          if (filaSalvamento.current.length > 0) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            await processarFila();
          }
          setTimeout(() => { carregarLogs(); carregarCardAulaData(); }, 300);
        }}
        data={dateHeaderClickData}
        indiceAula={indiceAtual}
        grupoId={grupoId}
        nivelTurma={turmaAtual?.nivel}
        faixaEtariaTurma={turmaAtual?.faixa_etaria}
        onAbrirBO={() => { setCardAulaAberto(false); setCardBOAberto(true); }}
      />

      <CardBO
        aberto={cardBOAberto}
        onClose={async () => {
          setCardBOAberto(false);
          if (filaSalvamento.current.length > 0) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            await processarFila();
          }
          setTimeout(() => { carregarLogs(); carregarCardAulaData(); }, 300);
        }}
        data={dateHeaderClickData}
        indiceAula={indiceAtual}
        grupoId={grupoId}
      />
    </div>
  );
};

export default Chamadas;