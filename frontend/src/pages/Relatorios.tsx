import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../utils/api';
import SearchInput from '../components/SearchInput';
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
  const [alunosLista, setAlunosLista] = useState<any[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const carregarFrequencia = useCallback(async () => {
    try {
      const res = await api.get(`/relatorios/frequencia?mes=${mes}&ano=${ano}`);
      setFreqData(res.data);
    } catch { setFreqData(null); }
  }, [mes, ano]);

  const carregarCancelamentos = useCallback(async () => {
    try {
      const res = await api.get(`/relatorios/cancelamentos?mes=${mes}&ano=${ano}`);
      setCancelData(res.data);
    } catch { setCancelData(null); }
  }, [mes, ano]);

  const carregarAlunos = useCallback(async () => {
    try {
      const res = await api.get('/alunos');
      setAlunosLista(res.data);
    } catch { setAlunosLista([]); }
  }, []);

  useEffect(() => { if (tab === 'frequencia') carregarFrequencia(); }, [tab, carregarFrequencia]);
  useEffect(() => { if (tab === 'cancelamentos') carregarCancelamentos(); }, [tab, carregarCancelamentos]);
  useEffect(() => { if (tab === 'historico') carregarAlunos(); }, [tab, carregarAlunos]);

  const exportCSV = () => {
    if (!cancelData) return;
    const headers = 'Data,Horario,Nivel,Motivo,Pessoal/Geral\n';
    const rows = cancelData.registros.map((r: any) =>
      `${r.data || ''},${r.indice_aula || ''},${r.nivel || ''},${r.motivo || ''},${r.tipo_select || ''}`
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
    if (!buscaHistorico.trim()) return alunosLista;
    const q = normalizeSearch(buscaHistorico);
    return alunosLista.filter((a: any) =>
      normalizeSearch(a.nome).includes(q)
    );
  }, [alunosLista, buscaHistorico]);

  const handleVerHistorico = async (aluno: any) => {
    setCarregandoHistorico(true);
    setAlunoSelecionado(aluno);
    try {
      const res = await api.get(`/relatorios/frequencia?mes=${mes}&ano=${ano}`);
      setFreqData(res.data);
    } catch { /* ignore */ }
    setCarregandoHistorico(false);
  };

  const rankings = (() => {
    if (!freqData) return null;
    const alunosRank: { nome: string; presencas: number; faltas: number; total: number }[] = [];
    const nomes = Object.keys(freqData.porProfessor);
    nomes.forEach((nome) => {
      const dados = freqData.porProfessor[nome];
      alunosRank.push({
        nome,
        presencas: dados.presentes,
        faltas: dados.total - dados.presentes,
        total: dados.total,
      });
    });
    const topPresenca = [...alunosRank].sort((a, b) => b.presencas - a.presencas).slice(0, 5);
    const topFaltas = [...alunosRank].sort((a, b) => b.faltas - a.faltas).slice(0, 5);
    return { topPresenca, topFaltas };
  })();

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

      {tab === 'frequencia' && freqData && (
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
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Frequência por Nível</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.entries(freqData.porNivel).map(([nivel, dados]) => ({ name: nivel, presentes: dados.presentes, faltas: dados.total - dados.presentes }))}>
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

          {rankings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 - Maior Presença</h3>
                <div className="space-y-2">
                  {rankings.topPresenca.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{i + 1}. {item.nome}</span>
                      <span className="text-green-600 font-medium">{item.presencas}/{item.total} ({calcPercentual(item.presencas, item.total)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 - Mais Faltas</h3>
                <div className="space-y-2">
                  {rankings.topFaltas.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{i + 1}. {item.nome}</span>
                      <span className="text-red-600 font-medium">{item.faltas} faltas</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Período</h3>
              <div className="space-y-2">
                {Object.entries(freqData.porHorario).map(([periodo, dados]) => (
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
                {Object.entries(freqData.porProfessor).map(([prof, dados]) => (
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
      )}

      {tab === 'cancelamentos' && cancelData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Cancelamentos', value: cancelData.total, cor: 'text-red-500' },
              { label: 'Motivos Distintos', value: Object.keys(cancelData.porMotivo).length, cor: 'text-orange-500' },
              { label: 'Níveis Afetados', value: Object.keys(cancelData.porNivel).length, cor: 'text-blue-500' },
              { label: 'Meses com Registro', value: Object.keys(cancelData.porMes).length, cor: 'text-purple-500' },
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
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(cancelData.porMotivo)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([motivo, qtd], i) => ({ name: motivo, value: qtd, fill: CORES_PIE[i % CORES_PIE.length] }))}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }: any) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {Object.entries(cancelData.porMotivo).slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolução Mensal</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={Object.entries(cancelData.porMes).sort(([a], [b]) => a.localeCompare(b)).map(([mesKey, qtd]) => ({ name: mesKey, cancelamentos: qtd }))}>
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
              {Object.entries(cancelData.porMotivo)
                .sort(([, a], [, b]) => b - a)
                .map(([motivo, qtd]) => {
                  const max = Math.max(1, ...Object.values(cancelData.porMotivo));
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
      )}

      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Histórico do Aluno</h3>
            <div className="flex gap-2 mb-4">
              <SearchInput
                value={buscaHistorico}
                onChange={setBuscaHistorico}
                placeholder="Buscar aluno por nome..."
                className="flex-1"
              />
            </div>

            {buscaHistorico && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
                {alunosFiltrados.map((aluno: any) => (
                  <button
                    key={aluno.id}
                    onClick={() => handleVerHistorico(aluno)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-800">{aluno.nome}</span>
                    <span className="text-xs text-gray-400">Ver histórico →</span>
                  </button>
                ))}
                {alunosFiltrados.length === 0 && (
                  <p className="px-3 py-4 text-sm text-gray-400 text-center">Nenhum aluno encontrado.</p>
                )}
              </div>
            )}

            {alunoSelecionado && (
              <div className="mt-4 border-t border-gray-200 pt-4">
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

                    <div className="bg-gray-50 rounded p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Linha do Tempo de Permanência</p>
                      <div className="space-y-3">
                        {Object.entries(freqData?.porNivel || {}).map(([nivel, dados], i) => (
                          <div key={nivel} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-primary-500" />
                              {i < Object.keys(freqData?.porNivel || {}).length - 1 && (
                                <div className="w-0.5 flex-1 bg-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <p className="text-sm font-medium text-gray-800">{nivel}</p>
                              <p className="text-xs text-gray-500">
                                Presenças: {dados.presentes}/{dados.total} ({calcPercentual(dados.presentes, dados.total)}%)
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!freqData?.porNivel || Object.keys(freqData.porNivel).length === 0) && (
                          <p className="text-xs text-gray-400">Nenhum dado de nível disponível para este período.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!buscaHistorico && !alunoSelecionado && (
              <p className="text-sm text-gray-400 text-center py-4">
                Digite o nome de um aluno para consultar o histórico completo de presenças e permanência.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
