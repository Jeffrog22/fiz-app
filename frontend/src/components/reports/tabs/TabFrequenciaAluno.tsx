import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../utils/api';
import SearchInput from '../../SearchInput';
import YearPicker from '../YearPicker';
import PeriodPicker from '../PeriodPicker';
import { normalizeSearch } from '../../../utils/formatters';
import type { FrequenciaAlunoItem } from '../../../types';

type Modo = 'historico' | 'ano' | 'mes';

const hoje = new Date();
const TabFrequenciaAluno: React.FC = () => {
  const [modo, setModo] = useState<Modo>('historico');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [data, setData] = useState<FrequenciaAlunoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const params = modo === 'historico' ? { mes: 0, ano: 0 }
    : modo === 'ano' ? { mes: 0, ano }
    : { mes, ano };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/frequencia-aluno', { params })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mes, params.ano]);

  const hasData = data.length > 0;

  const topPresenca = useMemo(() =>
    hasData ? [...data].sort((a, b) => b.percentual_presenca - a.percentual_presenca).slice(0, 5) : [],
    [data, hasData]);

  const topFaltas = useMemo(() =>
    hasData ? [...data].sort((a, b) => b.falta - a.falta).slice(0, 5) : [],
    [data, hasData]);

  const filtered = useMemo(() => {
    if (!search) return data;
    const n = normalizeSearch(search);
    return data.filter((d) => normalizeSearch(d.nome).includes(n));
  }, [data, search]);

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
          {/* rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                <span>🏆</span> Top 5 Presença
              </h3>
              <div className="space-y-2">
                {topPresenca.map((d, i) => (
                  <div key={d.aluno_id} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                      <span className="text-sm font-medium text-gray-800">{d.nome}</span>
                      {d.turma_label && <span className="text-xs text-gray-400">({d.turma_label})</span>}
                    </div>
                    <span className="text-sm font-semibold text-green-600">{d.percentual_presenca}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                <span>⚠️</span> Top 5 Faltas
              </h3>
              <div className="space-y-2">
                {topFaltas.map((d, i) => (
                  <div key={d.aluno_id} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                      <span className="text-sm font-medium text-gray-800">{d.nome}</span>
                      {d.turma_label && <span className="text-xs text-gray-400">({d.turma_label})</span>}
                    </div>
                    <span className="text-sm font-semibold text-red-600">{d.falta} falta{d.falta !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* grid com busca */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar aluno..."
              />
            </div>
            <div className="overflow-x-auto">
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
                  {filtered.map((d) => (
                    <tr key={d.aluno_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{d.nome}</td>
                      <td className="px-4 py-2 text-gray-600">{d.turma_label || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          d.percentual_presenca >= 80 ? 'bg-green-100 text-green-700'
                          : d.percentual_presenca >= 60 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
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
        </>
      )}
    </div>
  );
};

export default TabFrequenciaAluno;
