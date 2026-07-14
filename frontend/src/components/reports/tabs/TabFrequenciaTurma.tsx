import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import YearPicker from '../YearPicker';
import PeriodPicker from '../PeriodPicker';
import type { FrequenciaTurmaItem } from '../../../types';

type Modo = 'historico' | 'ano' | 'mes';

interface TimelineSlot {
  horario: string;
  presente: number;
  falta: number;
  justificado: number;
  total: number;
}

const hoje = new Date();

function cmpHorario(a: string, b: string): number {
  return a.substring(0, 5).localeCompare(b.substring(0, 5));
}

const TabFrequenciaTurma: React.FC = () => {
  const [modo, setModo] = useState<Modo>('historico');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [data, setData] = useState<FrequenciaTurmaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelAtiva, setLabelAtiva] = useState('');
  const [professorAtivo, setProfessorAtivo] = useState('');

  const params = modo === 'historico' ? { mes: 0, ano: 0 }
    : modo === 'ano' ? { mes: 0, ano }
    : { mes, ano };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/frequencia-turma', { params })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mes, params.ano]);

  const labels = useMemo(() => [...new Set(data.map((d) => d.label))].sort(), [data]);
  const professores = useMemo(() => [...new Set(data.map((d) => d.professor))].sort(), [data]);

  useEffect(() => {
    if (!labelAtiva && labels.length > 0) setLabelAtiva(labels[0]);
  }, [labels, labelAtiva]);

  useEffect(() => {
    if (!professorAtivo && professores.length > 0) setProfessorAtivo(professores[0]);
  }, [professores, professorAtivo]);

  const filteredData = useMemo(
    () => data.filter((d) => d.label === labelAtiva && d.professor === professorAtivo),
    [data, labelAtiva, professorAtivo],
  );

  const hasFiltered = filteredData.length > 0;
  const mediaPresenca = hasFiltered
    ? Math.round(filteredData.reduce((s, d) => s + d.percentual_presenca, 0) / filteredData.length)
    : 0;
  const melhor = hasFiltered
    ? filteredData.reduce((best, d) => d.percentual_presenca > best.percentual_presenca ? d : best, filteredData[0])
    : null;
  const pior = hasFiltered
    ? filteredData.reduce((worst, d) => d.percentual_presenca < worst.percentual_presenca ? d : worst, filteredData[0])
    : null;

  const timeline = useMemo(() => {
    const map = new Map<string, TimelineSlot>();
    for (const d of filteredData) {
      const h = d.horario;
      if (!map.has(h)) map.set(h, { horario: h, presente: 0, falta: 0, justificado: 0, total: 0 });
      const slot = map.get(h)!;
      slot.presente += d.presente;
      slot.falta += d.falta;
      slot.justificado += d.justificado;
      slot.total += d.presente + d.falta + d.justificado;
    }
    return Array.from(map.values()).sort((a, b) => cmpHorario(a.horario, b.horario));
  }, [filteredData]);

  const hasData = data.length > 0;

  return (
    <div className="space-y-4">
      {/* mode selector */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['historico', 'ano', 'mes'] as Modo[]).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`px-4 py-1.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              modo === m
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {m === 'historico' ? 'Histórico' : m === 'ano' ? 'Ano' : 'Mês'}
          </button>
        ))}
      </div>

      {/* conditional picker */}
      {modo === 'ano' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Ano:</span>
          <YearPicker ano={ano} onChange={setAno} />
        </div>
      )}
      {modo === 'mes' && (
        <PeriodPicker mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : !hasData ? (
        <p className="text-sm text-gray-400">Nenhum dado encontrado.</p>
      ) : (
        <>
          {/* cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CardStat titulo="Média de Presença" valor={`${mediaPresenca}%`} cor="text-green-600" icon="📊" />
            <CardStat titulo="Melhor Turma" valor={melhor ? `${melhor.percentual_presenca}%` : '-'} cor="text-primary-600" icon="🏆" />
            <CardStat titulo="Pior Turma" valor={pior ? `${pior.percentual_presenca}%` : '-'} cor="text-red-600" icon="⚠️" />
          </div>

          {/* filter row: label tabs + professor radios */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1">
              {labels.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabelAtiva(l)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    labelAtiva === l
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {professores.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="professor-turma"
                    checked={professorAtivo === p}
                    onChange={() => setProfessorAtivo(p)}
                    className="accent-primary-600"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* timeline chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Registros por Turma</h3>
            <div className="space-y-3">
              {timeline.map((slot) => {
                const { horario, presente, falta, justificado, total } = slot;
                const max = total > 0 ? total : 1;
                return (
                  <div key={horario} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 w-10 text-right shrink-0">
                      {horario.substring(0, 5)}
                    </span>
                    <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden relative flex">
                      {presente > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-[11px] font-bold text-white bg-green-500 transition-all"
                          style={{ width: `${(presente / max) * 100}%` }}
                        >
                          {presente}
                        </div>
                      )}
                      {falta > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-[11px] font-bold text-white bg-red-500 transition-all"
                          style={{ width: `${(falta / max) * 100}%` }}
                        >
                          {falta}
                        </div>
                      )}
                      {justificado > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-[11px] font-bold text-white bg-orange-400 transition-all"
                          style={{ width: `${(justificado / max) * 100}%` }}
                        >
                          {justificado}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right shrink-0">
                      {total}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* legend */}
            <div className="mt-4 flex items-center justify-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Presente</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Ausente</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Justificado</span>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-1">Horários das turmas</p>
          </div>

          {/* table */}
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
        </>
      )}
    </div>
  );
};

export default TabFrequenciaTurma;
