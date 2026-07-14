import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import YearPicker from '../YearPicker';
import type { CancelamentoData } from '../../../types';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const CORES = ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'];

const hoje = new Date();
const TabCancelamentos: React.FC = () => {
  const [ano, setAno] = useState(hoje.getFullYear());
  const [data, setData] = useState<CancelamentoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/cancelamentos', { params: { mes: 0, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ano]);

  const hasData = !!data && data.total > 0;
  const pieData = hasData ? data.porMotivo.map((d) => ({ name: d.motivo.charAt(0).toUpperCase() + d.motivo.slice(1), value: d.total })) : [];
  const barData = hasData ? data.porMes.map((d) => ({ mes: String(d.mes).padStart(2, '0'), Cancelamentos: d.total })) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Ano:</span>
        <YearPicker ano={ano} onChange={setAno} />
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : !hasData ? (
        <p className="text-sm text-gray-400">Nenhum cancelamento encontrado.</p>
      ) : (
        <>
          <CardStat titulo="Total de Cancelamentos" valor={data!.total} cor="text-orange-600" icon="🚫" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Motivo</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, idx) => (<Cell key={idx} fill={CORES[idx % CORES.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Mês</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis dataKey="mes" /><YAxis /><Tooltip />
                  <Bar dataKey="Cancelamentos" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TabCancelamentos;
