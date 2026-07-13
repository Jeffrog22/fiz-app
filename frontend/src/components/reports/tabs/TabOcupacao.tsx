import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import type { OcupacaoData } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TabOcupacao: React.FC = () => {
  const [data, setData] = useState<OcupacaoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/ocupacao')
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (!data || data.turmas.length === 0) return <p className="text-sm text-gray-400">Nenhuma turma encontrada.</p>;

  const mediaOcupacao = data.total_capacidade > 0 ? Math.round((data.total_ativos / data.total_capacidade) * 100) : 0;

  const chartData = data.turmas.map((d) => ({ nome: `${d.label} ${d.horario.substring(0, 5)}`, Ocupação: d.percentual }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Total Capacidade" valor={data.total_capacidade} cor="text-blue-600" icon="🏊" />
        <CardStat titulo="Total Alunos Ativos" valor={data.total_ativos} cor="text-green-600" icon="👤" />
        <CardStat titulo="Ocupação Média" valor={`${mediaOcupacao}%`} cor="text-primary-600" icon="📊" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">% Ocupação por Turma</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="Ocupação" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr><th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th><th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th><th className="text-left px-4 py-3 font-medium text-gray-600">Professor</th><th className="text-center px-4 py-3 font-medium text-gray-600">Capacidade</th><th className="text-center px-4 py-3 font-medium text-gray-600">Ocupação</th><th className="text-center px-4 py-3 font-medium text-gray-600">%</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.turmas.map((d) => (
              <tr key={d.grupo_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{d.label}</td>
                <td className="px-4 py-2 text-gray-600">{d.horario.substring(0, 5)}</td>
                <td className="px-4 py-2 text-gray-600">{d.professor}</td>
                <td className="px-4 py-2 text-center text-gray-700">{d.capacidade}</td>
                <td className="px-4 py-2 text-center font-medium text-gray-800">{d.ocupacao}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${d.percentual >= 80 ? 'bg-red-100 text-red-700' : d.percentual >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{d.percentual}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TabOcupacao;
