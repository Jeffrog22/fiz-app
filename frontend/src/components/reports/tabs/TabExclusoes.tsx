import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import PeriodPicker from '../PeriodPicker';
import YearPicker from '../YearPicker';
import type { ExclusaoStatsItem } from '../../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CORES_MOTIVO: Record<string, string> = {
  falta: '#ef4444', desistencia: '#f59e0b', transferencia: '#3b82f6', documentacao: '#94a3b8',
};

type Modo = 'historico' | 'ano' | 'mes';

const hoje = new Date();
const TabExclusoes: React.FC = () => {
  const [modo, setModo] = useState<Modo>('historico');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [data, setData] = useState<{ porMotivo: ExclusaoStatsItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const params = modo === 'historico' ? { mes: 0, ano: 0 }
    : modo === 'ano' ? { mes: 0, ano }
    : { mes, ano };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/exclusoes-stats', { params })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mes, params.ano]);

  const hasData = !!data && data.total > 0;
  const pieData = hasData ? data.porMotivo.map((d) => ({ name: d.motivo.charAt(0).toUpperCase() + d.motivo.slice(1), value: d.total })) : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        {(['historico', 'ano', 'mes'] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`px-4 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              modo === m
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'historico' ? 'Histórico' : m === 'ano' ? 'Ano' : 'Mês'}
          </button>
        ))}
      </div>

      {modo === 'ano' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Ano:</span>
          <YearPicker ano={ano} onChange={setAno} />
        </div>
      )}
      {modo === 'mes' && (
        <PeriodPicker mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : !hasData ? (
        <p className="text-sm text-gray-400">Nenhuma exclusão encontrada.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CardStat titulo="Total de Exclusões" valor={data!.total} cor="text-red-600" icon="🗑️" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Motivo</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, idx) => (<Cell key={idx} fill={CORES_MOTIVO[entry.name.toLowerCase()] || '#94a3b8'} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data!.porMotivo.map((item) => (
                <div key={item.motivo} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: CORES_MOTIVO[item.motivo] || '#94a3b8' }} />
                    <span className="text-sm font-medium text-gray-700 capitalize">{item.motivo}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{item.percentual}%</span>
                    <span className="text-sm font-bold text-gray-800">{item.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TabExclusoes;
