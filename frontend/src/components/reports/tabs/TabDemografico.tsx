import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import type { DemograficoData } from '../../../types';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const CORES_CAT = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const CORES_GEN = ['#3b82f6', '#ec4899', '#94a3b8'];

const TabDemografico: React.FC = () => {
  const [data, setData] = useState<DemograficoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/demografico')
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (!data || data.total === 0) return <p className="text-sm text-gray-400">Nenhum aluno ativo encontrado.</p>;

  const catPie = data.porCategoria.map((d) => ({ name: d.label, value: d.percentual }));
  const genPie = data.porGenero.map((d) => ({ name: d.label, value: d.total }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Total de Alunos Ativos" valor={data.total} cor="text-primary-600" icon="👥" />
        <CardStat titulo="Média de Idade" valor={`${data.media_idade} anos`} cor="text-blue-600" icon="📅" />
        <CardStat titulo="Categorias Distintas" valor={data.porCategoria.length} cor="text-purple-600" icon="🏷️" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Categoria</h3>
          <ResponsiveContainer width="100%" height={Math.max(250, catPie.length * 32)}>
            <BarChart data={catPie} layout="vertical" margin={{ left: 90 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={90} interval={0} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => `${Number(value) || 0}%`} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Gênero</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={genPie} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {genPie.map((_, idx) => (<Cell key={idx} fill={CORES_GEN[idx % CORES_GEN.length]} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Categorias</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.porCategoria.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-gray-700">{item.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-400" style={{ width: `${item.percentual}%` }} />
                  </div>
                  <span className="text-gray-500 w-10 text-right">{item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Gênero</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.porGenero.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-gray-700 capitalize">{item.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-400" style={{ width: `${item.percentual}%` }} />
                  </div>
                  <span className="text-gray-500 w-10 text-right">{item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabDemografico;
