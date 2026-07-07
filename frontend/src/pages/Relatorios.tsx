import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../utils/api';
import SearchInput from '../components/SearchInput';
import ErrorBoundary from '../components/ErrorBoundary';
import { normalizeSearch } from '../utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

interface FrequenciaData {
  resumo: { totalRegistros: number; presentes: number; faltas: number; justificados: number };
  porNivel: Record<string, { total: number; presentes: number }>;
  porHorario: Record<string, { total: number; presentes: number }>;
  porProfessor: Record<string, { total: number; presentes: number }>;
  topAlunos: {
    topPresenca: Array<{ nome: string; presencas: number; total: number }>;
    topFaltas: Array<{ nome: string; faltas: number; total: number }>;
  };
  alunosGrid: Array<{
    id: string; nome: string; ativo: boolean;
    presencas: number; justificados: number; faltas: number; total: number;
  }>;
  enrollmentPeriods?: Array<{
    id: string; nivel: string; turma_label: string;
    data_inicio: string; data_fim: string | null;
    total: number; presentes: number; faltas: number; justificados: number;
  }>;
  retencao?: { totalDias: number; diasDesdeInicio: number; percentual: number };
}

interface CancelamentoData {
  total: number;
  porMotivo: Record<string, number>;
  porNivel: Record<string, number>;
  porMes: Record<string, number>;
  registros: any[];
}

type Tab = 'frequencia' | 'cancelamentos' | 'historico';

const CORES_PIE = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];

function calcPercentual(parte: number, total: number): string {
  if (total === 0) return '0';
  return ((parte / total) * 100).toFixed(1);
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
}

function BarraProgresso({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const Relatorios: React.FC = () => {
  const [tab, setTab] = useState<Tab>('frequencia');
  const [freqData, setFreqData] = useState<FrequenciaData | null>(null);
  const [cancelData, setCancelData] = useState<CancelamentoData | null>(null);
  const [mes, setMes] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(String(new Date().getFullYear()));

  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [carregandoFreq, setCarregandoFreq] = useState(false);
  const [carregandoCancel, setCarregandoCancel] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const carregarFrequencia = useCallback(async () => {
    setCarregandoFreq(true);
    try {
      const res = await api.get(`/relatorios/frequencia?mes=${mes}&ano=${ano}`);
      setFreqData(res.data);
    } catch { setFreqData(null); }
    setCarregandoFreq(false);
  }, [mes, ano]);

  const carregarCancelamentos = useCallback(async () => {
    setCarregandoCancel(true);
    try {
      const res = await api.get(`/relatorios/cancelamentos?mes=${mes}&ano=${ano}`);
      setCancelData(res.data);
    } catch { setCancelData(null); }
    setCarregandoCancel(false);
  }, [mes, ano]);

  useEffect(() => { if (tab === 'frequencia' || tab === 'historico') carregarFrequencia(); }, [tab, carregarFrequencia]);
  useEffect(() => { if (tab === 'cancelamentos') carregarCancelamentos(); }, [tab, carregarCancelamentos]);

  const exportCSV = () => {
    if (!cancelData) return;
    const headers = 'Data,Horario,Motivo,Pessoal/Geral\n';
    const rows = cancelData.registros.map((r: any) =>
      `${r.data || ''},${r.indice_aula || ''},${r.motivo || ''},${r.tipo_select || ''}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancelamentos_${mes}_${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const alunosFiltrados = useMemo(() => {
    const grid = freqData?.alunosGrid || [];
    let filtered = grid;
    if (filtroStatus === 'ativos') filtered = filtered.filter((a: any) => a.ativo);
    if (filtroStatus === 'inativos') filtered = filtered.filter((a: any) => !a.ativo);
    if (buscaHistorico.trim()) {
      const q = normalizeSearch(buscaHistorico);
      filtered = filtered.filter((a: any) => normalizeSearch(a.nome).includes(q));
    }
    return filtered;
  }, [freqData?.alunosGrid, buscaHistorico, filtroStatus]);

  const handleVerHistorico = async (aluno: any) => {
    setCarregandoHistorico(true);
    setAlunoSelecionado(aluno);
    try {
      const res = await api.get(`/relatorios/frequencia?mes=${mes}&ano=${ano}&aluno_id=${aluno.id}`);
      setFreqData(res.data);
    } catch {
      setFreqData(null);
    }
    setCarregandoHistorico(false);
  };

  const carregando = tab === 'frequencia' ? carregandoFreq : tab === 'cancelamentos' ? carregandoCancel : true;

  return (
    <ErrorBoundary>
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
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="text-sm px-2 py-1.5 border border-gray-300 rounded">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={ano} onChange={(e) => setAno(e.target.value)} className="text-sm px-2 py-1.5 border border-gray-300 rounded">
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {tab === 'cancelamentos' && cancelData && (
            <button onClick={exportCSV} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition">
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {tab === 'frequencia' && (
        carregandoFreq ? <LoadingSpinner /> : freqData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total de Registros', value: freqData.resumo.totalRegistros, cor: 'text-blue-500' },
              { label: 'Presenças', value: freqData.resumo.presentes, cor: 'text-green-500' },
              { label: 'Faltas', value: freqData.resumo.faltas, cor: 'text-red-500' },
              { label: 'Justificados', value: freqData.resumo.justificados, cor: 'text-yellow-500' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.cor}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição de Presença</h3>
            {freqData.resumo.totalRegistros > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Presentes', value: freqData.resumo.presentes },
                      { name: 'Faltas', value: freqData.resumo.faltas },
                      { name: 'Justificados', value: freqData.resumo.justificados },
                    ]}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }: any) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {[0, 1, 2].map((i) => <Cell key={i} fill={CORES_PIE[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum registro no período.</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Frequência por Nível</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.entries(freqData.porNivel || {}).map(([nivel, dados]) => ({ name: nivel, presentes: dados.presentes, faltas: dados.total - dados.presentes }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="presentes" fill="#10B981" name="Presentes" />
                <Bar dataKey="faltas" fill="#EF4444" name="Faltas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {freqData.topAlunos && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 - Maior Presença</h3>
                <div className="space-y-2">
                  {(freqData.topAlunos.topPresenca || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{i + 1}. {item.nome}</span>
                      <span className="text-green-600 font-medium">{item.presencas}/{item.total} ({((item.presencas / item.total) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                  {(!freqData.topAlunos.topPresenca || freqData.topAlunos.topPresenca.length === 0) && (
                    <p className="text-xs text-gray-400">Nenhum dado disponível.</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 - Mais Faltas</h3>
                <div className="space-y-2">
                  {(freqData.topAlunos.topFaltas || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{i + 1}. {item.nome}</span>
                      <span className="text-red-600 font-medium">{item.faltas} faltas</span>
                    </div>
                  ))}
                  {(!freqData.topAlunos.topFaltas || freqData.topAlunos.topFaltas.length === 0) && (
                    <p className="text-xs text-gray-400">Nenhum dado disponível.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Período</h3>
              <div className="space-y-2">
                {Object.entries(freqData.porHorario || {}).map(([periodo, dados]) => (
                  <div key={periodo}>
                    <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                      <span>{periodo}</span>
                      <span>{dados.presentes}/{dados.total} ({calcPercentual(dados.presentes, dados.total)}%)</span>
                    </div>
                    <BarraProgresso valor={dados.presentes} max={dados.total} cor="bg-teal-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Professor</h3>
              <div className="space-y-2">
                {Object.entries(freqData.porProfessor || {}).map(([prof, dados]) => (
                  <div key={prof}>
                    <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                      <span>{prof}</span>
                      <span>{dados.presentes}/{dados.total} ({calcPercentual(dados.presentes, dados.total)}%)</span>
                    </div>
                    <BarraProgresso valor={dados.presentes} max={dados.total} cor="bg-purple-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {tab === 'cancelamentos' && (
        carregandoCancel ? <LoadingSpinner /> : cancelData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Cancelamentos', value: cancelData.total, cor: 'text-red-500' },
              { label: 'Motivos Distintos', value: Object.keys(cancelData.porMotivo || {}).length, cor: 'text-orange-500' },
              { label: 'Níveis Afetados', value: Object.keys(cancelData.porNivel || {}).length, cor: 'text-blue-500' },
              { label: 'Meses com Registro', value: Object.keys(cancelData.porMes || {}).length, cor: 'text-purple-500' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.cor}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Motivo</h3>
              {cancelData.total > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(cancelData.porMotivo || {})
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 6)
                        .map(([motivo, qtd], i) => ({ name: motivo, value: qtd, fill: CORES_PIE[i % CORES_PIE.length] }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }: any) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {Object.entries(cancelData.porMotivo || {}).slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum cancelamento no período.</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolução Mensal</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={Object.entries(cancelData.porMes || {}).sort(([a], [b]) => a.localeCompare(b)).map(([mesKey, qtd]) => ({ name: mesKey, cancelamentos: qtd }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cancelamentos" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Motivo (Detalhado)</h3>
            <div className="space-y-2">
              {Object.entries(cancelData.porMotivo || {})
                .sort(([, a], [, b]) => b - a)
                .map(([motivo, qtd]) => {
                  const max = Math.max(1, ...Object.values(cancelData.porMotivo || {}));
                  return (
                    <div key={motivo}>
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span className="capitalize">{motivo}</span>
                        <span>{qtd}</span>
                      </div>
                      <BarraProgresso valor={qtd} max={max} cor="bg-red-400" />
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
        )
      )}

      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <SearchInput
                value={buscaHistorico}
                onChange={setBuscaHistorico}
                placeholder="Buscar aluno por nome..."
                className="flex-1 min-w-[200px]"
              />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="text-sm px-2 py-1.5 border border-gray-300 rounded"
              >
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>

            {carregandoFreq ? <LoadingSpinner /> : freqData?.alunosGrid ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                        <th className="py-2 pr-3">Nome</th>
                        <th className="py-2 pr-3 text-center">Presenças</th>
                        <th className="py-2 pr-3 text-center">Justificativas</th>
                        <th className="py-2 pr-3 text-center">Faltas</th>
                        <th className="py-2 pr-3 text-center">Total</th>
                        <th className="py-2 pr-3 text-center">Taxa</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunosFiltrados.map((aluno: any) => {
                        const taxa = aluno.total > 0 ? ((aluno.presencas / aluno.total) * 100).toFixed(1) : 'N/A';
                        const taxaNum = aluno.total > 0 ? (aluno.presencas / aluno.total) * 100 : 0;
                        return (
                          <tr key={aluno.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 pr-3 font-medium text-gray-800 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${aluno.ativo ? 'bg-green-400' : 'bg-red-400'}`} />
                              {aluno.nome}
                            </td>
                            <td className="py-2 pr-3 text-center text-green-600">{aluno.presencas}</td>
                            <td className="py-2 pr-3 text-center text-yellow-600">{aluno.justificados}</td>
                            <td className="py-2 pr-3 text-center text-red-600">{aluno.faltas}</td>
                            <td className="py-2 pr-3 text-center text-gray-600">{aluno.total}</td>
                            <td className="py-2 pr-3 text-center">
                              <span className={`font-medium ${taxaNum >= 75 ? 'text-green-600' : taxaNum >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {typeof taxa === 'string' ? taxa : taxa + '%'}
                              </span>
                            </td>
                            <td className="py-2">
                              <button
                                onClick={() => handleVerHistorico(aluno)}
                                className="text-xs text-primary-600 hover:underline"
                              >
                                Histórico
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {alunosFiltrados.length === 0 && (
                        <tr><td colSpan={7} className="py-6 text-center text-gray-400">Nenhum aluno encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">{alunosFiltrados.length} de {(freqData?.alunosGrid?.length || 0)} alunos</p>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Selecione um mês/ano para carregar os dados.</p>
            )}

            {alunoSelecionado && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setAlunoSelecionado(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 mb-2"
                >
                  ← Voltar à lista
                </button>
                <h4 className="text-base font-semibold text-gray-800 mb-3">
                  {alunoSelecionado.nome}
                </h4>
                {carregandoHistorico ? (
                  <p className="text-sm text-gray-500">Carregando...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Total de Aulas', value: freqData?.resumo?.totalRegistros || 0, cor: 'text-blue-600' },
                        { label: 'Presenças', value: freqData?.resumo?.presentes || 0, cor: 'text-green-600' },
                        { label: 'Faltas', value: freqData?.resumo?.faltas || 0, cor: 'text-red-600' },
                        { label: 'Justificativas', value: freqData?.resumo?.justificados || 0, cor: 'text-yellow-600' },
                      ].map((card) => (
                        <div key={card.label} className="bg-gray-50 rounded p-3">
                          <p className="text-xs text-gray-500">{card.label}</p>
                          <p className={`text-xl font-bold mt-0.5 ${card.cor}`}>{card.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 rounded p-4">
                      <p className="text-sm text-gray-600 mb-1">Taxa de Assiduidade</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {freqData?.resumo?.totalRegistros
                          ? ((freqData.resumo.presentes / freqData.resumo.totalRegistros) * 100).toFixed(1) + '%'
                          : 'N/A'}
                      </p>
                      <BarraProgresso
                        valor={freqData?.resumo?.presentes || 0}
                        max={freqData?.resumo?.totalRegistros || 1}
                        cor="bg-blue-500"
                      />
                    </div>

                    {freqData?.retencao && (
                      <div className="bg-gray-50 rounded p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Índice de Retenção Total do Aluno</p>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1">
                            <BarraProgresso valor={freqData.retencao.totalDias} max={freqData.retencao.diasDesdeInicio} cor="bg-blue-500" />
                          </div>
                          <span className="text-lg font-bold text-blue-600">{freqData.retencao.percentual}%</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {freqData.retencao.totalDias} dias de permanência em {freqData.retencao.diasDesdeInicio} dias desde a primeira matrícula
                        </p>
                      </div>
                    )}

                    {freqData?.enrollmentPeriods && freqData.enrollmentPeriods.length > 0 && (
                      <div className="bg-gray-50 rounded p-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Linha do Tempo de Permanência</p>
                        <div className="space-y-3">
                          {freqData.enrollmentPeriods.map((p: any, i: number) => (
                            <div key={p.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full bg-primary-500" />
                                {i < freqData.enrollmentPeriods!.length - 1 && (
                                  <div className="w-0.5 flex-1 bg-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 pb-3">
                                <p className="text-sm font-medium text-gray-800">{p.turma_label || p.nivel}</p>
                                <p className="text-xs text-gray-500">
                                  De {new Date(p.data_inicio).toLocaleDateString('pt-BR')}
                                  {p.data_fim ? ` até ${new Date(p.data_fim).toLocaleDateString('pt-BR')}` : ' até o momento'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Presenças: {p.presentes}/{p.total} ({calcPercentual(p.presentes, p.total || 0)}%)
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!buscaHistorico && !alunoSelecionado && (
              <p className="text-sm text-gray-400 text-center py-4">
                Use a busca acima para encontrar alunos e ver o histórico de presenças.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default Relatorios;
