import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import BarraProgressoRelatorio from './BarraProgressoRelatorio';
import type { ControleMensalLabel } from '../../types';

interface Props {
  mes: string;
  ano: string;
}

const ControleMensalProfessor: React.FC<Props> = ({ mes, ano }) => {
  const [data, setData] = useState<ControleMensalLabel[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [labelSel, setLabelSel] = useState('');
  const [profSel, setProfSel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/relatorios/controle-mensal?mes=${mes}&ano=${ano}`)
      .then(res => {
        const items = res.data as ControleMensalLabel[];
        setData(items);
        const uniqueLabels = [...new Set(items.map(i => i.label))];
        const uniqueProfs = [...new Map(items.map(i => [i.professor, { id: i.professor, nome: i.professor }])).values()];
        setLabels(uniqueLabels);
        setProfessores(uniqueProfs);
        if (uniqueLabels.length > 0 && !labelSel) setLabelSel(uniqueLabels[0]);
      })
      .catch(() => setData([]));
  }, [mes, ano]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ mes, ano });
    if (labelSel) params.set('label', labelSel);
    if (profSel) params.set('professor_id', profSel);
    api.get(`/relatorios/controle-mensal?${params.toString()}`)
      .then(res => setData(res.data as ControleMensalLabel[]))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [mes, ano, labelSel, profSel]);

  if (loading && data.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Controle Mensal de Aulas</h3>

      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Turma:</span>
          <div className="flex gap-1 flex-wrap">
            {labels.map(l => (
              <button
                key={l}
                onClick={() => setLabelSel(l === labelSel ? '' : l)}
                className={`px-2 py-0.5 text-xs rounded-full border transition ${
                  labelSel === l
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Professor:</span>
          <div className="flex gap-1 flex-wrap">
            {professores.map(p => (
              <button
                key={p.id}
                onClick={() => setProfSel(p.id === profSel ? '' : p.id)}
                className={`px-2 py-0.5 text-xs rounded-full border transition ${
                  profSel === p.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.map(item => (
          <div key={`${item.label}-${item.professor}`}>
            <p className="text-xs font-medium text-gray-500 mb-1">
              {item.label} — {item.professor}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="text-left py-1 pr-4">Horário</th>
                  <th className="text-right py-1 pr-3">Aulas</th>
                  <th className="w-28 py-1">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {item.horarios.map(h => {
                  const pct = h.previstas > 0 ? (h.dadas / h.previstas) : 0;
                  const cor = pct >= 0.9 ? 'bg-green-400' : pct >= 0.7 ? 'bg-yellow-400' : 'bg-red-400';
                  return (
                    <tr key={h.horario} className="border-b border-gray-50">
                      <td className="py-1.5 pr-4 text-gray-700">{h.horario}</td>
                      <td className="py-1.5 pr-3 text-right font-medium text-gray-800">
                        {h.dadas}
                        <span className="text-gray-400 font-normal">/{h.previstas}</span>
                      </td>
                      <td className="py-1.5 w-28">
                        <BarraProgressoRelatorio valor={h.dadas} max={h.previstas} cor={cor} height="h-2" showPercent />
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const pct = item.totalPrevistas > 0 ? (item.totalDadas / item.totalPrevistas) : 0;
                  const cor = pct >= 0.9 ? 'bg-green-400' : pct >= 0.7 ? 'bg-yellow-400' : 'bg-red-400';
                  return (
                    <tr className="font-semibold text-gray-800">
                      <td className="py-2 pr-4">Total</td>
                      <td className="py-2 pr-3 text-right">
                        {item.totalDadas}
                        <span className="text-gray-400 font-normal">/{item.totalPrevistas}</span>
                      </td>
                      <td className="py-2 w-28">
                        <BarraProgressoRelatorio valor={item.totalDadas} max={item.totalPrevistas} cor={cor} height="h-2" showPercent />
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControleMensalProfessor;