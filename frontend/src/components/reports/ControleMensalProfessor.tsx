import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import type { ControleMensalLabel } from '../../types';

interface Props {
  mes: string;
  ano: string;
}

const ControleMensalProfessor: React.FC<Props> = ({ mes, ano }) => {
  const [data, setData] = useState<ControleMensalLabel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/relatorios/controle-mensal?mes=${mes}&ano=${ano}`)
      .then(res => setData(res.data as ControleMensalLabel[]))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [mes, ano]);

  if (loading && data.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) return null;

  const pct = (d: number, p: number) => p > 0 ? Math.round((d / p) * 100) : 0;
  const cor = (v: number) => v >= 90 ? 'text-green-600' : v >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm text-xs space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Controle Mensal</h3>
      <table className="w-full">
        <thead>
          <tr className="text-gray-400 border-b">
            <th className="text-left py-1">Turma</th>
            <th className="text-right py-1 pr-2">Aulas</th>
            <th className="text-right py-1">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => {
            const v = pct(item.totalDadas, item.totalPrevistas);
            return (
              <tr key={`${item.label}-${item.professor}`} className="border-b border-gray-50">
                <td className="py-1.5 text-gray-700 truncate max-w-[120px]">
                  {item.label} {item.professor !== 'Geral' ? `(${item.professor})` : ''}
                </td>
                <td className="py-1.5 text-right font-medium text-gray-800 pr-2">
                  {item.totalDadas}<span className="text-gray-400">/{item.totalPrevistas}</span>
                </td>
                <td className={`py-1.5 text-right font-semibold ${cor(v)}`}>{v}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ControleMensalProfessor;
