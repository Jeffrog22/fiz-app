import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { normalizeSearch } from '../utils/formatters';
import FrequencyMetrics from '../components/reports/FrequencyMetrics';
import ClassTimelineChart from '../components/reports/ClassTimelineChart';
import GridAnalitico from '../components/reports/GridAnalitico';
import HistoricoAluno from '../components/reports/HistoricoAluno';
import CancelamentoDashboard from '../components/reports/CancelamentoDashboard';
import ControleMensalProfessor from '../components/reports/ControleMensalProfessor';
import type { FrequenciaData, CancelamentoDashboard as CancelamentoDashboardType, FrequencyMetrics as FrequencyMetricsType, TimelineData } from '../types';

type Tab = 'frequencia' | 'cancelamentos' | 'historico';

const Relatorios: React.FC = () => {
  const [tab, setTab] = useState<Tab>('frequencia');
  const [freqData, setFreqData] = useState<FrequenciaData | null>(null);
  const [cancelData, setCancelData] = useState<CancelamentoDashboardType | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [metrics, setMetrics] = useState<FrequencyMetricsType | null>(null);
  const [mes, setMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(String(new Date().getFullYear()));

  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [carregandoFreq, setCarregandoFreq] = useState(false);
  const [carregandoCancel, setCarregandoCancel] = useState(false);
  const [carregandoTimeline, setCarregandoTimeline] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroFreq, setErroFreq] = useState<string | null>(null);
  const [erroCancel, setErroCancel] = useState<string | null>(null);

  const [labelSelecionada, setLabelSelecionada] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [periodo, setPeriodo] = useState<'mes' | 'ano'>('mes');
  const [incluirJustificados, setIncluirJustificados] = useState(false);

  const carregarFrequencia = useCallback(async () => {
    setCarregandoFreq(true);
    setErroFreq(null);
    try {
      const [freqRes, metricsRes] = await Promise.all([
        api.get(`/relatorios/frequencia?mes=${mes}&ano=${ano}`),
        api.get(`/relatorios/metricas?periodo=${periodo}`),
      ]);
      const data = freqRes.data as FrequenciaData;
      const metricsData = metricsRes.data as FrequencyMetricsType;
      setFreqData(data);
      setMetrics(metricsData);
      if (data.timeline) {
        if (data.timeline.labels.length > 0 && !labelSelecionada) {
          setLabelSelecionada(data.timeline.labels[0]);
        }
        if (data.timeline.professores.length > 0 && !professorId) {
          setProfessorId(data.timeline.professores[0].id);
        }
      }
    } catch {
      setFreqData(null);
      setMetrics(null);
      setErroFreq('Erro ao carregar dados de frequência. Verifique sua conexão.');
    }
    setCarregandoFreq(false);
  }, [mes, ano, periodo]);

  const carregarCancelamentos = useCallback(async () => {
    setCarregandoCancel(true);
    setErroCancel(null);
    try {
      const res = await api.get(`/relatorios/cancelamentos?mes=${mes}&ano=${ano}&incluir_justificados=${incluirJustificados}`);
      setCancelData(res.data);
    } catch {
      setCancelData(null);
      setErroCancel('Erro ao carregar dados de cancelamentos. Verifique sua conexão.');
    }
    setCarregandoCancel(false);
  }, [mes, ano, incluirJustificados]);

  const carregarTimeline = useCallback(async () => {
    if (!labelSelecionada || !professorId) return;
    setCarregandoTimeline(true);
    try {
      const params = new URLSearchParams({ mes, ano, label: labelSelecionada, professor_id: professorId });
      const res = await api.get(`/relatorios/timeline?${params.toString()}`);
      setTimelineData(res.data);
    } catch {
      setTimelineData(null);
    }
    setCarregandoTimeline(false);
  }, [mes, ano, labelSelecionada, professorId]);

  useEffect(() => { if (tab === 'frequencia' || tab === 'historico') carregarFrequencia(); }, [tab, carregarFrequencia, periodo]); // Adiciona 'periodo' como dependência
  useEffect(() => { if (tab === 'cancelamentos') carregarCancelamentos(); }, [tab, carregarCancelamentos, incluirJustificados]);
  useEffect(() => { if (tab === 'frequencia' && labelSelecionada && professorId) carregarTimeline(); }, [tab, carregarTimeline, labelSelecionada, professorId]);

  const exportCSV = () => {
    if (!cancelData) return;
    const incluir = incluirJustificados ? 'com_justificadas' : 'so_cancelados';
    const headers = 'Data,Horario,Status,Motivo,Tipo\n';
    const rows = cancelData.registros.map((r: any) =>
      `${r.data || ''},${r.horario ? r.horario.substring(0, 5) : ''},${r.status || ''},${r.motivo || ''},${r.tipo_select || ''}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancelamentos_${mes}_${ano}_${incluir}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const alunosFiltrados = useMemo(() => {
    const grid = freqData?.alunosGrid || [];
    let filtered = grid;
    if (filtroStatus === 'ativos') filtered = filtered.filter((a) => a.ativo);
    if (filtroStatus === 'inativos') filtered = filtered.filter((a) => !a.ativo);
    if (buscaHistorico.trim()) {
      const q = normalizeSearch(buscaHistorico);
      filtered = filtered.filter((a) => normalizeSearch(a.nome).includes(q));
    }
    return filtered;
  }, [freqData?.alunosGrid, buscaHistorico, filtroStatus]);

  const handleVerHistorico = async (alunoId: string) => {
    setCarregandoHistorico(true);
    const aluno = (freqData?.alunosGrid || []).find((a) => a.id === alunoId) || null;
    setAlunoSelecionado(aluno);
    try {
      const res = await api.get(`/relatorios/frequencia?mes=${mes}&ano=${ano}&aluno_id=${alunoId}`);
      setFreqData(res.data);
    } catch {
      setFreqData(null);
    }
    setCarregandoHistorico(false);
  };

  const handleVoltar = useCallback(() => {
    setAlunoSelecionado(null);
    carregarFrequencia();
  }, [carregarFrequencia]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>

      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['frequencia', 'cancelamentos', 'historico'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded transition ${
                tab === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'frequencia' ? 'Frequência' : t === 'cancelamentos' ? 'Cancelamentos' : 'Histórico'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="text-sm px-2 py-1.5 border border-gray-300 rounded"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="text-sm px-2 py-1.5 border border-gray-300 rounded"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {tab === 'cancelamentos' && cancelData && (
            <button
              onClick={exportCSV}
              className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {tab === 'frequencia' && (
        carregandoFreq ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : erroFreq ? (
          <p className="text-sm text-red-500 text-center py-4">{erroFreq}</p>
        ) : freqData ? (
          <div className="space-y-4">
            <FrequencyMetrics
              metrics={metrics}
              periodo={periodo}
              onPeriodoChange={setPeriodo}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ControleMensalProfessor mes={mes} ano={ano} />
              {carregandoTimeline ? (
                <div className="flex justify-center items-center py-12 bg-white rounded-lg border border-gray-200">
                  <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <ClassTimelineChart
                  data={timelineData}
                  labelSelecionada={labelSelecionada}
                  onLabelChange={setLabelSelecionada}
                  professorId={professorId}
                  onProfessorChange={setProfessorId}
                />
              )}
            </div>
            <GridAnalitico
              porNivel={freqData.porNivel}
              porHorario={freqData.porHorario}
              porPeriodo={freqData.porPeriodo}
              porProfessor={freqData.porProfessor}
              topPresenca={freqData.topAlunos.topPresenca}
              topFaltas={freqData.topAlunos.topFaltas}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Selecione um mês/ano para carregar os dados.</p>
        )
      )}

      {tab === 'cancelamentos' && (
        erroCancel ? (
          <p className="text-sm text-red-500 text-center py-4">{erroCancel}</p>
        ) : (
          <CancelamentoDashboard
            data={cancelData}
            carregando={carregandoCancel}
            incluirJustificados={incluirJustificados}
            onToggleJustificados={() => setIncluirJustificados(v => !v)}
          />
        )
      )}

      {tab === 'historico' && (
        <HistoricoAluno
          data={freqData}
          carregando={carregandoFreq}
          onVerHistorico={handleVerHistorico}
          alunoSelecionado={alunoSelecionado?.id || null}
          onVoltar={handleVoltar}
          alunosFiltrados={alunosFiltrados}
          busca={buscaHistorico}
          onBuscaChange={setBuscaHistorico}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={(v) => setFiltroStatus(v as any)}
        />
      )}
    </div>
  );
};

export default Relatorios;
