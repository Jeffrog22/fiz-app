import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import BarraProgressoRelatorio from './BarraProgressoRelatorio';
import { formatTime } from '../../utils/formatters';
import type { ControleMensalLabel } from '../../types';

interface Props {
  mes: string;
  ano: string;
  periodo: 'semana' | 'mes' | 'ano';
}

const ControleMensalProfessor: React.FC<Props> = ({ mes, ano, periodo }) => {
  const [data, setData] = useState<ControleMensalLabel[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [labelSel, setLabelSel] = useState('');
  const [profSel, setProfSel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ periodo });
    if (mes) params.set("mes", mes);
    if (ano) params.set("ano", ano);
    if (labelSel) params.set("label", labelSel);
    if (profSel) params.set("professor_id", profSel);

    api.get(`/relatorios/controle-mensal?${params.toString()}`)
      .then(res => {
        const items = res.data as ControleMensalLabel[];
        setData(items);
        // Populate labels and professors only once when data is first loaded or period changes
        if (periodo !== "semana" && periodo !== "ano") { // Only for monthly view initially
          const uniqueLabels = [...new Set(items.map(i => i.label))];
          const uniqueProfs = [...new Map(items.map(i => [i.professor, { id: i.professor, nome: i.professor }])).values()];
          setLabels(uniqueLabels);
          setProfessores(uniqueProfs);
          if (uniqueLabels.length > 0 && !labelSel) setLabelSel(uniqueLabels[0]);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [mes, ano, labelSel, profSel, periodo]);

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
      <h3 className="text-sm font-semibold text-gray-700">Controle Mensal de Aulas e Frequências</h3>

      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Turma:</span>
          <div className="flex gap-2 flex-wrap">
            {labels.map(l => (
              <button
                key={l}
                onClick={() => setLabelSel(l === labelSel ? '' : l)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  labelSel === l
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Professor:</span>
          <div className="flex gap-2 flex-wrap">
            {professores.map(p => (
              <button
                key={p.id}
                onClick={() => setProfSel(p.id === profSel ? '' : p.id)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  profSel === p.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div key={`${item.label}-${item.professor}`} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {item.label} — {item.professor}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1">Horário</h4>
                {item.horarios.map(h => (
                  <p key={h.horario} className="text-sm text-gray-700 py-1">{formatTime(h.horario)}</p>
                ))}
                <p className="text-sm font-semibold text-gray-800 py-1 mt-2">Total</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1">Aulas</h4>
                {item.horarios.map(h => (
                  <div key={h.horario} className="py-1">
                    <span className="text-sm font-medium text-gray-800">{h.dadas}</span>
                    <span className="text-sm text-gray-400 font-normal">/{h.previstas}</span>
                  </div>
                ))}
                <div className="py-1 mt-2">
                  <span className="text-sm font-semibold text-gray-800">{item.totalDadas}</span>
                  <span className="text-sm text-gray-400 font-normal">/{item.totalPrevistas}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1">Progresso</h4>
                {item.horarios.map(h => {
                  const pct = h.previstas > 0 ? (h.dadas / h.previstas) : 0;
                  const cor = pct >= 0.9 ? 'bg-green-400' : pct >= 0.7 ? 'bg-yellow-400' : 'bg-red-400';
                  return (
                    <div key={h.horario} className="py-1">
                      <BarraProgressoRelatorio valor={h.dadas} max={h.previstas} cor={cor} height="h-3" showPercent />
                    </div>
                  );
                })}
                <div className="py-1 mt-2">
                  {(() => {
                    const pct = item.totalPrevistas > 0 ? (item.totalDadas / item.totalPrevistas) : 0;
                    const cor = pct >= 0.9 ? 'bg-green-400' : pct >= 0.7 ? 'bg-yellow-400' : 'bg-red-400';
                    return (
                      <BarraProgressoRelatorio valor={item.totalDadas} max={item.totalPrevistas} cor={cor} height="h-3" showPercent />
                    );
                  })()}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1">Registros</h4>
                {item.horarios.map(h => (
                  <div key={h.horario} className="py-1 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold">{h.dadas}</div>
                    <span className="text-sm text-gray-700">{h.previstas}</span>
                  </div>
                ))}
                <div className="py-1 mt-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold">{item.totalDadas}</div>
                  <span className="text-sm text-gray-700">{item.totalPrevistas}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-600 mt-4">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-400"></span> Presente
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-400"></span> Ausente
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span> Justificado
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControleMensalProfessor;