import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import PeriodPicker from '../PeriodPicker';
import type { FrequenciaAlunoItem } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const hoje = new Date();
const TabFrequenciaAluno: React.FC = () => {
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
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
    Presente: d.presente, Falta: d.falta, Justificado: d.justificado,
  }));

  return (
    <div className="space-y-4">
      <PeriodPicker mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Média de Presença" valor={`${mediaPresenca}%`} cor="text-green-600" icon="📊" />
        <CardStat titulo="Maior Presença" valor={`${top.percentual_presenca}%`} cor="text-primary-600" icon="🏆" />
        <CardStat titulo="Menor Presença" valor={`${bottom.percentual_presenca}%`} cor="text-red-600" icon="⚠️" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Presença por Aluno (top 20)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="Presente" fill="#22c55e" stackId="a" />
            <Bar dataKey="Falta" fill="#ef4444" stackId="a" />
            <Bar dataKey="Justificado" fill="#f59e0b" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr><th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th><th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th><th className="text-center px-4 py-3 font-medium text-gray-600">%</th><th className="text-center px-4 py-3 font-medium text-gray-600">P</th><th className="text-center px-4 py-3 font-medium text-gray-600">F</th><th className="text-center px-4 py-3 font-medium text-gray-600">J</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((d) => (
              <tr key={d.aluno_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{d.nome}</td>
                <td className="px-4 py-2 text-gray-600">{d.turma_label || '-'}</td>
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

export default TabFrequenciaAluno;
