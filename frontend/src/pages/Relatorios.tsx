import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';

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

  useEffect(() => { if (tab === 'frequencia') carregarFrequencia(); }, [tab, carregarFrequencia]);
  useEffect(() => { if (tab === 'cancelamentos') carregarCancelamentos(); }, [tab, carregarCancelamentos]);

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Relat\u00f3rios</h1>

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
              {t === 'frequencia' ? 'Frequ\u00eancia' : t === 'cancelamentos' ? 'Cancelamentos' : 'Hist\u00f3rico'}
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
              { label: 'Presen\u00e7as', value: freqData.resumo.presentes, cor: 'text-green-500' },
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
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Frequ\u00eancia por N\u00edvel</h3>
            <div className="space-y-2">
              {Object.entries(freqData.porNivel).map(([nivel, dados]) => (
                <div key={nivel}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>{nivel}</span>
                    <span>{dados.presentes}/{dados.total} ({calcPercentual(dados.presentes, dados.total)}%)</span>
                  </div>
                  <BarraProgresso valor={dados.presentes} max={dados.total} cor="bg-blue-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Per\u00edodo</h3>
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
              { label: 'N\u00edveis Afetados', value: Object.keys(cancelData.porNivel).length, cor: 'text-blue-500' },
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Motivo</h3>
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

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolu\u00e7\u00e3o Mensal</h3>
              <div className="space-y-2">
                {Object.entries(cancelData.porMes)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([mesKey, qtd]) => {
                    const max = Math.max(1, ...Object.values(cancelData.porMes));
                    return (
                      <div key={mesKey}>
                        <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                          <span>{mesKey}</span>
                          <span>{qtd}</span>
                        </div>
                        <BarraProgresso valor={qtd} max={max} cor="bg-orange-400" />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Hist\u00f3rico do Aluno</h3>
          <p className="text-sm text-gray-500">Consulte o hist\u00f3rico completo de presen\u00e7as e perman\u00eancia do aluno.</p>
          <p className="text-xs text-gray-400 mt-2">Em breve: busca por nome com linha do tempo vertical e taxas de assiduidade.</p>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
