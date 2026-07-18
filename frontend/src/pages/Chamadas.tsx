import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DataGrid from '../components/grid/DataGrid';
import ChamadaFilters from '../components/grid/ChamadaFilters';
import GridPagination from '../components/grid/GridPagination';
import CardAula from '../components/modals/CardAula';
import CardBO from '../components/modals/CardBO';
import type { Aluno, Turma, Professor, ChamadaLog, AnotacaoAluno, CalendarioEvento } from '../types';
import { gerarDiasLetivos, hojeMesAno } from '../utils/chamadaUtils';

type PresencaStatus = 'presente' | 'falta' | 'justificado' | 'cancelado' | 'feriado' | 'ponte' | 'reuniao' | 'evento' | undefined;

const MAX_UNDO = 10;

interface UndoAction {
  type: 'presenca' | 'anotacao' | 'limpar';
  alunoId?: string;
  data?: string;
  indice?: number;
  statusAntigo?: PresencaStatus;
  motivoAntigo?: string;
  batch?: Array<{ alunoId: string; statusAntigo?: PresencaStatus }>;
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
  const [cardAulaData, setCardAulaData] = useState<Record<string, Record<number, any>>>({});
  const [originaisMap, setOriginaisMap] = useState<Record<string, boolean>>({});

  const [limparConfirm, setLimparConfirm] = useState(false);
  const [undoCount, setUndoCount] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filaSalvamento = useRef<any[]>([]);
  const undoStack = useRef<UndoAction[]>([]);

  const statusSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setAlunosComAnotacao(new Set(data.map((a) => a.aluno_id)));
    } catch (err) {
      console.error('Erro ao carregar anotacoes', err);
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

  const carregarOriginais = useCallback(async () => {
    if (!grupoId || alunosDaTurma.length === 0) {
      setOriginaisMap({});
      return;
    }
    try {
      const res = await api.post('/chamadas/verificar-originais', {
        grupo_id: grupoId,
        mes,
        ano,
        aluno_ids: alunosDaTurma.map((a) => a.id),
      });
      setOriginaisMap(res.data || {});
    } catch {
      setOriginaisMap({});
    }
  }, [grupoId, mes, ano, alunosDaTurma]);

  useEffect(() => { carregarDados(); }, [carregarDados, labelSelecionada, professorId]);
  useEffect(() => { carregarLogs(); }, [carregarLogs]);
  useEffect(() => { aplicarEventosCalendario(); }, [aplicarEventosCalendario]);
  useEffect(() => { carregarAnotacoes(); }, [carregarAnotacoes]);
  useEffect(() => { carregarCardAulaData(); }, [carregarCardAulaData]);
  useEffect(() => { carregarCardAulaData(); }, [indiceAtual]);
  useEffect(() => { carregarOriginais(); }, [carregarOriginais]);

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
      if (!retroativo && data < dias[0]) return;

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
    setCardAulaAberto(true);
  }, []);

  const handleAnotacaoChange = useCallback((_alunoId: string) => {
    carregarAnotacoes();
  }, [carregarAnotacoes]);

  const handleSaveJustificativa = useCallback(
    (alunoId: string, data: string, motivo: string) => {
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
    },
    [indiceAtual, agendarSalvamento],
  );

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
      case 'limpar': {
        if (!action.batch) return;
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
    }
  }, [indiceAtual, agendarSalvamento]);

  const handleLimpar = useCallback(() => {
    if (alunosDaTurma.length === 0 || dias.length === 0) return;
    const data = dias[0];
    const batch = alunosDaTurma.map((a) => ({
      alunoId: a.id,
      statusAntigo: logs[a.id]?.[data]?.[indiceAtual]?.status,
    }));
    undoStack.current.push({ type: 'limpar', data, indice: indiceAtual, batch });
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
    agendarSalvamento(payload);
    setLimparConfirm(false);
  }, [alunosDaTurma, dias, indiceAtual, logs, agendarSalvamento]);

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
        return <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />Salvando...</span>;
      case 'saved':
        return <span className="flex items-center gap-1.5 text-xs text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full" />Salvo</span>;
      case 'error':
        return <span className="flex items-center gap-1.5 text-xs text-red-500"><span className="w-2 h-2 bg-red-500 rounded-full" />Erro ao salvar</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Chamadas</h1>
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
            className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 border border-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Desfazer
          </button>
          {alunosDaTurma.length > 0 && (
            <button onClick={() => setLimparConfirm(true)}
              className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200 transition">
              Limpar
            </button>
          )}
          <button onClick={() => { if (!dateHeaderClickData) setDateHeaderClickData(dias[0] || ''); setCardAulaAberto(true); }} disabled={!grupoId}
            className="px-3 py-1.5 text-xs bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 border border-cyan-200 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Card Aula
          </button>
          <button onClick={() => { if (!dateHeaderClickData) setDateHeaderClickData(dias[0] || ''); setCardBOAberto(true); }} disabled={!grupoId}
            className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 border border-orange-200 transition disabled:opacity-30 disabled:cursor-not-allowed">
            Card BO
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : !labelSelecionada ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Selecione uma turma para visualizar a chamada
        </div>
      ) : !professorId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Selecione um professor
        </div>
      ) : totalIndices === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Nenhuma turma encontrada para esta combinação
        </div>
      ) : dias.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
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
          onTogglePresenca={handleTogglePresenca}
          onUpdateAnotacao={handleUpdateAnotacao}
          onDateHeaderClick={handleDateHeaderClick}
          alunosComAnotacao={alunosComAnotacao}
          onAnotacaoChange={handleAnotacaoChange}
          onSaveJustificativa={handleSaveJustificativa}
          onNomeDoubleClick={handleNomeDoubleClick}
          originaisMap={originaisMap}
        />
      )}

      {limparConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setLimparConfirm(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl m-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Limpar Chamada</h3>
            <p className="text-sm text-gray-600 mb-4">
              Deseja limpar todas as presenças de <strong>{alunosDaTurma.length} alunos</strong>
              {' '}no índice de aula <strong>{indiceAtual + 1}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLimparConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
              <button onClick={handleLimpar}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Limpar</button>
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