import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import YearPicker from '../YearPicker';
import type { RotatividadeItem } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TabRotatividade: React.FC = () => {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [data, setData] = useState<RotatividadeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/rotatividade', { params: { mes: 0, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ano]);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (data.length === 0) return <p className="text-sm text-gray-400">Nenhum dado encontrado.</p>;

  const totalMatriculas = data.reduce((s, d) => s + d.matricula_inicial, 0);
  const totalTransferencias = data.reduce((s, d) => s + d.transferencia, 0);
  const totalCorrecoes = data.reduce((s, d) => s + d.correcao, 0);

  const chartData = data.map((d) => ({ mes: String(d.mes).padStart(2, '0'), 'Matrículas': d.matricula_inicial, 'Correções': d.correcao, 'Transferências': d.transferencia }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Ano:</span>
        <YearPicker ano={ano} onChange={setAno} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Novas Matrículas" valor={totalMatriculas} cor="text-green-600" icon="➕" />
        <CardStat titulo="Transferências" valor={totalTransferencias} cor="text-blue-600" icon="🔄" />
        <CardStat titulo="Correções" valor={totalCorrecoes} cor="text-yellow-600" icon="✏️" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Movimentações por Mês</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="mes" /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="Matrículas" fill="#22c55e" stackId="a" />
            <Bar dataKey="Correções" fill="#f59e0b" stackId="a" />
            <Bar dataKey="Transferências" fill="#3b82f6" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr><th className="text-left px-4 py-3 font-medium text-gray-600">Mês</th><th className="text-center px-4 py-3 font-medium text-gray-600">Matrículas</th><th className="text-center px-4 py-3 font-medium text-gray-600">Correções</th><th className="text-center px-4 py-3 font-medium text-gray-600">Transferências</th><th className="text-center px-4 py-3 font-medium text-gray-600">Total</th></tr>
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

export default TabRotatividade;
