import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import PeriodPicker from '../PeriodPicker';
import type { FrequenciaTurmaItem } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const hoje = new Date();
const TabFrequenciaTurma: React.FC = () => {
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
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

  const chartData = data.map((d) => ({ nome: `${d.label} ${d.horario.substring(0, 5)}`, 'Presença %': d.percentual_presenca }));

  return (
    <div className="space-y-4">
      <PeriodPicker mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
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
            <tr><th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th><th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th><th className="text-left px-4 py-3 font-medium text-gray-600">Professor</th><th className="text-left px-4 py-3 font-medium text-gray-600">Nível</th><th className="text-center px-4 py-3 font-medium text-gray-600">%</th><th className="text-center px-4 py-3 font-medium text-gray-600">P</th><th className="text-center px-4 py-3 font-medium text-gray-600">F</th><th className="text-center px-4 py-3 font-medium text-gray-600">J</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((d) => (
              <tr key={d.grupo_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{d.label}</td>
                <td className="px-4 py-2 text-gray-600">{d.horario.substring(0, 5)}</td>
                <td className="px-4 py-2 text-gray-600">{d.professor}</td>
                <td className="px-4 py-2 text-gray-600">{d.nivel}</td>
                <td className="px-4 py-2 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded ${d.percentual_presenca >= 80 ? 'bg-green-100 text-green-700' : d.percentual_presenca >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{d.percentual_presenca}%</span></td>
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

export default TabFrequenciaTurma;
