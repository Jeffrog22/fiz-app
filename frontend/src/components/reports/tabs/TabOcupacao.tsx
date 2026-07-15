import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import type { OcupacaoData, OcupacaoTurmaItem } from '../../../types';

interface HorarioAgrupado {
  horario: string;
  totalOcupacao: number;
  totalCapacidade: number;
  percentual: number;
  turmas: OcupacaoTurmaItem[];
}

const corBarra = (ocup: number, cap: number) => ocup > cap ? 'bg-red-500' : ocup === cap ? 'bg-yellow-500' : 'bg-blue-500';
const formatTime = (s: string) => s.length >= 5 ? s.substring(0, 5) : s;

const TabOcupacao: React.FC = () => {
  const [data, setData] = useState<OcupacaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/ocupacao')
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const labels = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, Map<string, HorarioAgrupado>>();
    for (const t of data.turmas) {
      if (!map.has(t.label)) map.set(t.label, new Map());
      const horMap = map.get(t.label)!;
      if (!horMap.has(t.horario)) {
        horMap.set(t.horario, { horario: t.horario, totalOcupacao: 0, totalCapacidade: 0, percentual: 0, turmas: [] });
      }
      const h = horMap.get(t.horario)!;
      h.totalOcupacao += t.ocupacao;
      h.totalCapacidade += t.capacidade;
      h.turmas.push(t);
    }
    for (const horMap of map.values()) {
      for (const h of horMap.values()) {
        h.percentual = h.totalCapacidade > 0 ? Math.round((h.totalOcupacao / h.totalCapacidade) * 100) : 0;
      }
    }
    return Array.from(map.entries()).map(([label, horMap]) => ({
      label,
      horarios: Array.from(horMap.values()).sort((a, b) => a.horario.localeCompare(b.horario)),
    }));
  }, [data]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (!data || data.turmas.length === 0) return <p className="text-sm text-gray-400">Nenhuma turma encontrada.</p>;

  const mediaOcupacao = data.total_capacidade > 0 ? Math.round((data.total_ativos / data.total_capacidade) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardStat titulo="Total Capacidade" valor={data.total_capacidade} cor="text-blue-600" icon="🏊" />
        <CardStat titulo="Total Alunos Ativos" valor={data.total_ativos} cor="text-green-600" icon="👤" />
        <CardStat titulo="Ocupação Média" valor={`${mediaOcupacao}%`} cor="text-primary-600" icon="📊" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {labels.map(({ label, horarios }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {horarios.map((h) => {
                const key = `${label}|${h.horario}`;
                const isOpen = expanded.has(key);
                return (
                  <div key={h.horario}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(key)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xs font-medium text-gray-500 w-10">{formatTime(h.horario)}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${corBarra(h.totalOcupacao, h.totalCapacidade)}`} style={{ width: `${h.percentual}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{h.totalOcupacao}</span>
                      <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-2 space-y-1">
                        {h.turmas.map((t) => (
                          <div key={t.grupo_id} className="flex items-center gap-3 pl-10 py-1 text-xs">
                            <span className="text-gray-600 flex-1 truncate">
                              {t.nivel || 'Sem nível'} | {t.professor}
                            </span>
                            <div className="w-20 h-2.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                              <div className={`h-full rounded-full ${corBarra(t.ocupacao, t.capacidade)}`} style={{ width: `${t.percentual}%` }} />
                            </div>
                            <span className="text-gray-700 font-medium w-14 text-right flex-shrink-0">{t.ocupacao}/{t.capacidade}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Ocupação</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.turmas.map((d) => (
              <tr key={d.grupo_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{d.label}</td>
                <td className="px-4 py-2 text-gray-600">{formatTime(d.horario)}</td>
                <td className="px-4 py-2 text-center font-medium text-gray-800">{d.ocupacao}/{d.capacidade}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${d.ocupacao > d.capacidade ? 'bg-red-100 text-red-700' : d.ocupacao === d.capacidade ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{d.percentual}%</span>
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
