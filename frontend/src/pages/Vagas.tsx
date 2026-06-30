import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';

interface VagaTurma {
  id: string;
  horario: string;
  label: string;
  professor: string;
  nivel: string;
  capacidade: number;
  alunos_ativos: number;
  vagas: number;
  excedente: number;
}

interface VagasData {
  totais: { capacidade: number; ativos: number; vagas: number; excedente: number };
  turmas: VagaTurma[];
}

const Vagas: React.FC = () => {
  const [data, setData] = useState<VagasData | null>(null);
  const [nivel, setNivel] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (nivel) params.set('nivel', nivel);
      if (periodo) params.set('periodo', periodo);
      const res = await api.get(`/vagas?${params.toString()}`);
      setData(res.data);
    } catch { setData(null); }
  }, [nivel, periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Vagas</h1>

      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          value={nivel}
          onChange={(e) => setNivel(e.target.value)}
          placeholder="Filtrar por nível"
          className="text-sm px-3 py-1.5 border border-gray-300 rounded"
        />
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="text-sm px-2 py-1.5 border border-gray-300 rounded">
          <option value="">Todos os períodos</option>
          <option value="manha">Manhã</option>
          <option value="tarde">Tarde</option>
        </select>
        <button onClick={carregar} className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition">
          Filtrar
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Capacidade Total', value: data.totais.capacidade, cor: 'text-blue-600' },
              { label: 'Alunos Ativos', value: data.totais.ativos, cor: 'text-green-600' },
              { label: 'Vagas Disponíveis', value: data.totais.vagas, cor: data.totais.vagas > 0 ? 'text-primary-600' : 'text-gray-400' },
              { label: 'Excedente', value: data.totais.excedente, cor: data.totais.excedente > 0 ? 'text-red-600' : 'text-gray-400' },
            ].map((card) => (
              <div
                key={card.label}
                className={`bg-white rounded-lg border p-4 shadow-sm cursor-pointer transition hover:shadow-md ${
                  card.value > 0 && card.label === 'Vagas Disponíveis' ? 'border-primary-200' : 'border-gray-200'
                }`}
                onClick={() => {
                  if (card.label === 'Vagas Disponíveis' && data?.turmas) {
                    setNivel('');
                    setPeriodo('');
                  }
                }}
              >
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.cor}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {data.turmas.map((turma) => {
                const isExpanded = expandedId === turma.id;
                const badgeVaga = turma.vagas > 0 && turma.excedente === 0;
                const badgeLotada = turma.vagas === 0 && turma.excedente === 0;
                const badgeExcedente = turma.excedente > 0;

                return (
                  <div key={turma.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : turma.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{turma.horario?.substring(0, 5)}</span>
                        <span className="text-sm text-gray-600">{turma.label}</span>
                        <span className="text-xs text-gray-400">{turma.professor}</span>
                        <span className="text-xs text-gray-400">{turma.nivel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <BarraProgressoVaga ativos={turma.alunos_ativos} capacidade={turma.capacidade} />
                          <span className="text-gray-500 w-12 text-right">{turma.alunos_ativos}/{turma.capacidade}</span>
                        </div>
                        {badgeExcedente && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                            +{turma.excedente} excedente
                          </span>
                        )}
                        {badgeLotada && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded font-medium">
                            Lotada
                          </span>
                        )}
                        {badgeVaga && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            {turma.vagas} {turma.vagas === 1 ? 'vaga' : 'vagas'}
                          </span>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-100">
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Turma: <strong>{turma.label}</strong></p>
                          <p>Professor: <strong>{turma.professor}</strong></p>
                          <p>Nível: <strong>{turma.nivel}</strong></p>
                          <p>Horário: <strong>{turma.horario?.substring(0, 5)}</strong></p>
                          <p>Lotação: <strong>{turma.alunos_ativos}/{turma.capacidade}</strong></p>
                          {turma.vagas > 0 && <p className="text-blue-600">Vagas disponíveis: <strong>{turma.vagas}</strong></p>}
                          {turma.excedente > 0 && <p className="text-red-600">Excedente: <strong>{turma.excedente}</strong></p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {data.turmas.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma turma encontrada.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function BarraProgressoVaga({ ativos, capacidade }: { ativos: number; capacidade: number }) {
  const pct = capacidade > 0 ? Math.min(100, (ativos / capacidade) * 100) : 0;
  const cor = pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default Vagas;
