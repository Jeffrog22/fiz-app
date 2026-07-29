import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import YearPicker from '../YearPicker';
import type { CancelamentoData } from '../../../types';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatDateBR } from '../../../utils/formatters';

const CORES = ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8', '#22c55e', '#a855f7'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
  const [escopoFiltro, setEscopoFiltro] = useState<'todos' | 'pessoal' | 'geral'>('todos');
  const [motivoFilter, setMotivoFilter] = useState('');
  const [nivelFilter, setNivelFilter] = useState('');

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

  const uniqueMotivos = useMemo(() => {
    if (!data?.registros) return [];
    return [...new Set(data.registros.map((r) => r.motivo))].sort();
  }, [data]);

  const uniqueNiveis = useMemo(() => {
    if (!data?.registros) return [];
    const niveis = new Set(data.registros.map((r) => r.nivel).filter(Boolean));
    return [...niveis].sort() as string[];
  }, [data]);

  const filteredRegistros = useMemo(() => {
    if (!data?.registros) return [];
    let list = data.registros;
    if (motivoFilter) list = list.filter((r) => r.motivo === motivoFilter);
    if (nivelFilter) list = list.filter((r) => r.nivel === nivelFilter);
    if (escopoFiltro === 'pessoal') list = list.filter((r) => r.tipo_select === 'pessoal');
    else if (escopoFiltro === 'geral') list = list.filter((r) => r.tipo_select !== 'pessoal');
    return list;
  }, [data, motivoFilter, nivelFilter, escopoFiltro]);

  const topMotivo = useMemo(() => {
    if (!filteredRegistros.length) return '-';
    const counts = new Map<string, number>();
    filteredRegistros.forEach((r) => counts.set(r.motivo, (counts.get(r.motivo) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [filteredRegistros]);

  const topNivel = useMemo(() => {
    const comNivel = filteredRegistros.filter((r) => r.nivel);
    if (!comNivel.length) return '-';
    const counts = new Map<string, number>();
    comNivel.forEach((r) => counts.set(r.nivel!, (counts.get(r.nivel!) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [filteredRegistros]);

  const topMes = useMemo(() => {
    if (!filteredRegistros.length) return '-';
    const counts = new Map<number, number>();
    filteredRegistros.forEach((r) => {
      const m = new Date(r.data).getMonth() + 1;
      counts.set(m, (counts.get(m) || 0) + 1);
    });
    const m = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return MESES[m - 1] || '-';
  }, [filteredRegistros]);

  const chartPorMotivo = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRegistros.forEach((r) => counts.set(r.motivo, (counts.get(r.motivo) || 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filteredRegistros]);

  const chartEvolucao = useMemo(() => {
    const arr = new Array(12).fill(0);
    filteredRegistros.forEach((r) => { const m = new Date(r.data).getMonth(); arr[m]++; });
    return arr.map((v, i) => ({ mes: MESES[i], Cancelamentos: v }));
  }, [filteredRegistros]);

  const chartPorNivel = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRegistros.forEach((r) => {
      const n = r.nivel || 'Sem nível';
      counts.set(n, (counts.get(n) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredRegistros]);

  const chartPorTurno = useMemo(() => {
    let manha = 0, tarde = 0;
    filteredRegistros.forEach((r) => {
      const h = parseInt(r.horario || '0');
      if (h < 12) manha++;
      else tarde++;
    });
    return [
      { name: 'Manhã (até 12h)', value: manha },
      { name: 'Tarde (pós 12h)', value: tarde },
    ];
  }, [filteredRegistros]);

  const sorted = useMemo(() => {
    const list = [...filteredRegistros];
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
  }, [filteredRegistros, sortRules]);

  const hasData = !!data && data.total > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Ano:</span>
          <YearPicker ano={ano} onChange={setAno} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Motivo:</span>
          <select
            value={motivoFilter}
            onChange={(e) => setMotivoFilter(e.target.value)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
          >
            <option value="">Todos</option>
            {uniqueMotivos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Nível:</span>
          <select
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
          >
            <option value="">Todos</option>
            {uniqueNiveis.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {(motivoFilter || nivelFilter) && (
          <button
            type="button"
            onClick={() => { setMotivoFilter(''); setNivelFilter(''); }}
            className="text-xs text-red-600 hover:text-red-800"
          >
            Limpar filtros
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : !hasData ? (
        <p className="text-sm text-gray-400">Nenhum cancelamento encontrado.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CardStat titulo="Total de Cancelamentos" valor={filteredRegistros.length} cor="text-orange-600" icon="🚫" />
            <CardStat titulo="Motivo + Frequente" valor={topMotivo} cor="text-blue-600" icon="📌" />
            <CardStat titulo="Nível + Cancelado" valor={topNivel} cor="text-purple-600" icon="📊" />
            <CardStat titulo="Mês Crítico" valor={topMes} cor="text-red-600" icon="📅" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Motivo</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartPorMotivo} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {chartPorMotivo.map((_, idx) => (<Cell key={idx} fill={CORES[idx % CORES.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolução Mensal</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartEvolucao}>
                  <XAxis dataKey="mes" /><YAxis /><Tooltip />
                  <Line type="monotone" dataKey="Cancelamentos" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Nível</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartPorNivel} layout="vertical">
                  <XAxis type="number" /><YAxis type="category" dataKey="name" width={80} /><Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Turno</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartPorTurno}>
                  <XAxis dataKey="name" /><YAxis /><Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Ocorrências</h3>
              <div className="flex items-center gap-1">
                {(['todos', 'pessoal', 'geral'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEscopoFiltro(opt)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-full border transition-colors ${
                      escopoFiltro === opt
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {opt === 'todos' ? 'Todos' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
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
