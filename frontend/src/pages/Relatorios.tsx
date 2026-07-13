import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import CardStat from '../components/reports/CardStat';
import PeriodPicker from '../components/reports/PeriodPicker';
import type { FrequenciaAlunoItem, FrequenciaTurmaItem, RotatividadeItem, ExclusaoStatsItem } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CORES_PRESENCA = ['#22c55e', '#ef4444', '#f59e0b', '#94a3b8'];
const CORES_MOTIVO: Record<string, string> = {
  falta: '#ef4444',
  desistencia: '#f59e0b',
  transferencia: '#3b82f6',
  documentacao: '#94a3b8',
};
const CORES_ROTATIVIDADE = ['#22c55e', '#f59e0b', '#3b82f6'];

type TabId = 'frequencia-aluno' | 'frequencia-turma' | 'rotatividade' | 'exclusoes';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'frequencia-aluno', label: 'Frequência por Aluno' },
  { id: 'frequencia-turma', label: 'Frequência por Turma' },
  { id: 'rotatividade', label: 'Rotatividade' },
  { id: 'exclusoes', label: 'Exclusões' },
];

const hoje = new Date();
const Relatorios: React.FC = () => {
  const [tab, setTab] = useState<TabId>('frequencia-aluno');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const handlePeriodChange = useCallback((m: number, a: number) => {
    setMes(m);
    setAno(a);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <PeriodPicker mes={mes} ano={ano} onChange={handlePeriodChange} />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'frequencia-aluno' && <TabFrequenciaAluno mes={mes} ano={ano} />}
      {tab === 'frequencia-turma' && <TabFrequenciaTurma mes={mes} ano={ano} />}
      {tab === 'rotatividade' && <TabRotatividade mes={mes} ano={ano} />}
      {tab === 'exclusoes' && <TabExclusoes mes={mes} ano={ano} />}
    </div>
  );
};

/* ─── Aba: Frequência por Aluno ─── */
const TabFrequenciaAluno: React.FC<{ mes: number; ano: number }> = ({ mes, ano }) => {
  const [data, setData] = useState<FrequenciaAlunoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/frequencia-aluno', { params: { mes, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mes, ano]);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (data.length === 0) return <p className="text-sm text-gray-400">Nenhum dado encontrado.</p>;

  const mediaPresenca = Math.round(data.reduce((s, d) => s + d.percentual_presenca, 0) / data.length);
  const top = data.reduce((best, d) => d.percentual_presenca > best.percentual_presenca ? d : best, data[0]);
  const bottom = data.reduce((worst, d) => d.percentual_presenca < worst.percentual_presenca ? d : worst, data[0]);

  const chartData = data.slice(0, 20).map((d) => ({
    nome: d.nome.length > 12 ? d.nome.substring(0, 12) + '...' : d.nome,
    Presente: d.presente,
    Falta: d.falta,
    Justificado: d.justificado,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Média de Presença" valor={`${mediaPresenca}%`} cor="text-green-600" icon="📊" />
        <CardStat titulo="Maior Presença" valor={`${top.percentual_presenca}%`} cor="text-primary-600" icon="🏆" />
        <CardStat titulo="Menor Presença" valor={`${bottom.percentual_presenca}%`} cor="text-red-600" icon="⚠️" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Presença por Aluno (top 20)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Presente" fill="#22c55e" stackId="a" />
            <Bar dataKey="Falta" fill="#ef4444" stackId="a" />
            <Bar dataKey="Justificado" fill="#f59e0b" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">%</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">P</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">F</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">J</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((d) => (
              <tr key={d.aluno_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{d.nome}</td>
                <td className="px-4 py-2 text-gray-600">{d.turma_label || '-'}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    d.percentual_presenca >= 80 ? 'bg-green-100 text-green-700' :
                    d.percentual_presenca >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {d.percentual_presenca}%
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-green-600 font-medium">{d.presente}</td>
                <td className="px-4 py-2 text-center text-red-600 font-medium">{d.falta}</td>
                <td className="px-4 py-2 text-center text-yellow-600 font-medium">{d.justificado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Aba: Frequência por Turma ─── */
const TabFrequenciaTurma: React.FC<{ mes: number; ano: number }> = ({ mes, ano }) => {
  const [data, setData] = useState<FrequenciaTurmaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/frequencia-turma', { params: { mes, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mes, ano]);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (data.length === 0) return <p className="text-sm text-gray-400">Nenhum dado encontrado.</p>;

  const mediaPresenca = Math.round(data.reduce((s, d) => s + d.percentual_presenca, 0) / data.length);
  const melhor = data.reduce((best, d) => d.percentual_presenca > best.percentual_presenca ? d : best, data[0]);
  const pior = data.reduce((worst, d) => d.percentual_presenca < worst.percentual_presenca ? d : worst, data[0]);

  const chartData = data.map((d) => ({
    nome: `${d.label} ${d.horario.substring(0, 5)}`,
    'Presença %': d.percentual_presenca,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Média de Presença" valor={`${mediaPresenca}%`} cor="text-green-600" icon="📊" />
        <CardStat titulo="Melhor Turma" valor={`${melhor.percentual_presenca}%`} cor="text-primary-600" icon="🏆" />
        <CardStat titulo="Pior Turma" valor={`${pior.percentual_presenca}%`} cor="text-red-600" icon="⚠️" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">% Presença por Turma</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="Presença %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Professor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nível</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">%</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">P</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">F</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">J</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((d) => (
              <tr key={d.grupo_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{d.label}</td>
                <td className="px-4 py-2 text-gray-600">{d.horario.substring(0, 5)}</td>
                <td className="px-4 py-2 text-gray-600">{d.professor}</td>
                <td className="px-4 py-2 text-gray-600">{d.nivel}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    d.percentual_presenca >= 80 ? 'bg-green-100 text-green-700' :
                    d.percentual_presenca >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {d.percentual_presenca}%
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-green-600 font-medium">{d.presente}</td>
                <td className="px-4 py-2 text-center text-red-600 font-medium">{d.falta}</td>
                <td className="px-4 py-2 text-center text-yellow-600 font-medium">{d.justificado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Aba: Rotatividade ─── */
const TabRotatividade: React.FC<{ mes: number; ano: number }> = ({ mes, ano }) => {
  const [data, setData] = useState<RotatividadeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/rotatividade', { params: { mes, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mes, ano]);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (data.length === 0) return <p className="text-sm text-gray-400">Nenhum dado encontrado.</p>;

  const totalMatriculas = data.reduce((s, d) => s + d.matricula_inicial, 0);
  const totalTransferencias = data.reduce((s, d) => s + d.transferencia, 0);
  const totalCorrecoes = data.reduce((s, d) => s + d.correcao, 0);

  const chartData = data.map((d) => ({
    mes: String(d.mes).padStart(2, '0'),
    'Matrículas': d.matricula_inicial,
    'Correções': d.correcao,
    'Transferências': d.transferencia,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Novas Matrículas" valor={totalMatriculas} cor="text-green-600" icon="➕" />
        <CardStat titulo="Transferências" valor={totalTransferencias} cor="text-blue-600" icon="🔄" />
        <CardStat titulo="Correções" valor={totalCorrecoes} cor="text-yellow-600" icon="✏️" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Movimentações por Mês</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Matrículas" fill="#22c55e" stackId="a" />
            <Bar dataKey="Correções" fill="#f59e0b" stackId="a" />
            <Bar dataKey="Transferências" fill="#3b82f6" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Mês</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Matrículas</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Correções</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Transferências</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((d) => (
              <tr key={d.mes} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{String(d.mes).padStart(2, '0')}</td>
                <td className="px-4 py-2 text-center text-green-600 font-medium">{d.matricula_inicial}</td>
                <td className="px-4 py-2 text-center text-yellow-600 font-medium">{d.correcao}</td>
                <td className="px-4 py-2 text-center text-blue-600 font-medium">{d.transferencia}</td>
                <td className="px-4 py-2 text-center font-medium text-gray-800">{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Aba: Exclusões ─── */
const TabExclusoes: React.FC<{ mes: number; ano: number }> = ({ mes, ano }) => {
  const [data, setData] = useState<{ porMotivo: ExclusaoStatsItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/exclusoes-stats', { params: { mes, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mes, ano]);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (!data || data.total === 0) return <p className="text-sm text-gray-400">Nenhuma exclusão encontrada.</p>;

  const pieData = data.porMotivo.map((d) => ({
    name: d.motivo.charAt(0).toUpperCase() + d.motivo.slice(1),
    value: d.total,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CardStat titulo="Total de Exclusões" valor={data.total} cor="text-red-600" icon="🗑️" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Motivo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={CORES_MOTIVO[entry.name.toLowerCase()] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {data.porMotivo.map((item) => (
            <div key={item.motivo} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: CORES_MOTIVO[item.motivo] || '#94a3b8' }}
                />
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.porMotivo.map((item) => (
              <tr key={item.motivo} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800 capitalize">{item.motivo}</td>
                <td className="px-4 py-2 text-center font-bold text-gray-800">{item.total}</td>
                <td className="px-4 py-2 text-center text-gray-600">{item.percentual}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Relatorios;
