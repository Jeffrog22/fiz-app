import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import YearPicker from '../YearPicker';
import type { CancelamentoData } from '../../../types';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { formatDateBR } from '../../../utils/formatters';

const CORES = ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'];

interface SortRule {
  column: string;
  dir: 'asc' | 'desc';
}

const hoje = new Date();
const TabCancelamentos: React.FC = () => {
  const [ano, setAno] = useState(hoje.getFullYear());
  const [data, setData] = useState<CancelamentoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/cancelamentos', { params: { mes: 0, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ano]);

  const toggleSort = (column: string) => {
    setSortRules((prev) => {
      const idx = prev.findIndex((r) => r.column === column);
      if (idx === 0) {
        if (prev[0].dir === 'asc') return [{ column, dir: 'desc' }, ...prev.slice(1)];
        return prev.slice(1);
      }
      return [{ column, dir: 'asc' }, ...prev.filter((r) => r.column !== column)];
    });
  };

  const sortIcon = (column: string) => {
    const idx = sortRules.findIndex((r) => r.column === column);
    if (idx === -1) return null;
    const dir = sortRules[idx].dir;
    return (
      <span className="ml-1 text-xs text-primary-600">
        {idx > 0 && <sup className="text-[10px]">{idx + 1}</sup>}
        {dir === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  const thSort = (column: string, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="font-medium text-gray-500 hover:text-gray-700 text-left text-xs uppercase whitespace-nowrap"
    >
      {label}
      {sortIcon(column)}
    </button>
  );

  const hasData = !!data && data.total > 0;
  const pieData = hasData ? data.porMotivo.map((d) => ({ name: d.motivo.charAt(0).toUpperCase() + d.motivo.slice(1), value: d.total })) : [];
  const barData = hasData ? data.porMes.map((d) => ({ mes: String(d.mes).padStart(2, '0'), Cancelamentos: d.total })) : [];

  const sorted = useMemo(() => {
    if (!data?.registros) return [];
    const list = [...data.registros];
    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { column, dir } = sortRules[i];
      list.sort((a, b) => {
        let va: string, vb: string;
        switch (column) {
          case 'data': va = a.data; vb = b.data; break;
          case 'motivo': va = a.motivo; vb = b.motivo; break;
          case 'turma_label': va = a.turma_label || ''; vb = b.turma_label || ''; break;
          case 'horario': va = a.horario || ''; vb = b.horario || ''; break;
          case 'professor': va = a.professor || ''; vb = b.professor || ''; break;
          case 'grupo_id': va = a.grupo_id; vb = b.grupo_id; break;
          default: return 0;
        }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [data, sortRules]);

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

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Ocorrências</h3>
              <span className="text-xs text-gray-500">{sorted.length} registro(s)</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">{thSort('data', 'Data')}</th>
                    <th className="text-left px-4 py-2 font-medium">{thSort('motivo', 'Motivo')}</th>
                    <th className="text-left px-4 py-2 font-medium">{thSort('turma_label', 'Turma')}</th>
                    <th className="text-left px-4 py-2 font-medium">{thSort('horario', 'Horário')}</th>
                    <th className="text-left px-4 py-2 font-medium">{thSort('professor', 'Professor')}</th>
                    <th className="text-left px-4 py-2 font-medium">{thSort('grupo_id', 'Grupo')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatDateBR(r.data)}</td>
                      <td className="px-4 py-2 text-gray-700 capitalize">{r.motivo}</td>
                      <td className="px-4 py-2 text-gray-700">{r.turma_label || '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.horario ? r.horario.substring(0, 5) : '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{r.professor || '-'}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{r.grupo_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TabCancelamentos;
