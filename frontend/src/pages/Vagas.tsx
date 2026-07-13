import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../utils/api';
import type { VagasResponse, VagaHorario } from '../types';

function getCor(excedente: number, vagas: number): 'blue' | 'yellow' | 'red' {
  if (excedente > 0) return 'red';
  if (vagas === 0) return 'yellow';
  return 'blue';
}

function getBadge(excedente: number, vagas: number): { text: string; className: string } {
  if (excedente > 0)
    return { text: `+${excedente} ${excedente === 1 ? 'excedente' : 'excedentes'}`, className: 'bg-red-100 text-red-700' };
  if (vagas === 0)
    return { text: 'Lotada', className: 'bg-yellow-100 text-yellow-700' };
  return { text: `${vagas} ${vagas === 1 ? 'vaga' : 'vagas'}`, className: 'bg-blue-100 text-blue-700' };
}

function BarraProgressoVaga({ ativos, capacidade, cor }: { ativos: number; capacidade: number; cor: 'blue' | 'yellow' | 'red' }) {
  const pct = capacidade > 0 ? Math.min(100, (ativos / capacidade) * 100) : 0;
  const barClass = cor === 'red' ? 'bg-red-400' : cor === 'yellow' ? 'bg-yellow-400' : 'bg-blue-400';
  return (
    <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${barClass} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const Vagas: React.FC = () => {
  const [data, setData] = useState<VagasResponse | null>(null);
  const [nivel, setNivel] = useState('');
  const [turmaLabel, setTurmaLabel] = useState('');
  const [periodo, setPeriodo] = useState<'todos' | 'manha' | 'tarde'>('todos');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [vagasFilter, setVagasFilter] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await api.get('/vagas');
      setData(res.data);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) carregar(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [carregar]);

  const niveis = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const h of data.horarios) {
      for (const g of h.grupos) {
        if (g.nivel) set.add(g.nivel);
      }
    }
    return Array.from(set).sort();
  }, [data]);

  const labels = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const h of data.horarios) {
      if (h.label) set.add(h.label);
    }
    return Array.from(set).sort();
  }, [data]);

  const filteredHorarios = useMemo(() => {
    if (!data) return [];
    let list: VagaHorario[] = data.horarios;

    if (nivel) list = list.filter((h) => h.grupos.some((g) => g.nivel === nivel));
    if (turmaLabel) list = list.filter((h) => h.label === turmaLabel);
    if (periodo === 'manha') list = list.filter((h) => h.horario < '12:00');
    if (periodo === 'tarde') list = list.filter((h) => h.horario >= '12:00');
    if (vagasFilter) list = list.filter((h) => h.total_vagas > 0);

    return list;
  }, [data, nivel, turmaLabel, periodo, vagasFilter]);

  const displayExpandedKeys = useMemo(() => {
    if (vagasFilter) {
      return new Set(filteredHorarios.map((h) => `${h.horario}|${h.label}`));
    }
    return expandedKeys;
  }, [vagasFilter, filteredHorarios, expandedKeys]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleNivelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVagasFilter(false);
    setNivel(e.target.value);
  };

  const handleTurmaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVagasFilter(false);
    setTurmaLabel(e.target.value);
  };

  const handlePeriodoChange = (val: 'todos' | 'manha' | 'tarde') => {
    setVagasFilter(false);
    setPeriodo(val);
  };

  const handleCardVagasClick = () => {
    if (vagasFilter) {
      setVagasFilter(false);
      setExpandedKeys(new Set());
    } else {
      setNivel('');
      setTurmaLabel('');
      setPeriodo('todos');
      setVagasFilter(true);
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Vagas</h1>
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Vagas</h1>

      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={nivel}
          onChange={handleNivelChange}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
        >
          <option value="">Nível (todos)</option>
          {niveis.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <select
          value={turmaLabel}
          onChange={handleTurmaChange}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
        >
          <option value="">Turma (todas)</option>
          {labels.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {(['todos', 'manha', 'tarde'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodoChange(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                periodo === p
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p === 'todos' ? 'Todos' : p === 'manha' ? 'Manhã' : 'Tarde'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CardIndicador
          titulo="Capacidade Total"
          valor={data.totais.capacidade}
          corValor="text-blue-600"
          onClick={undefined}
        />
        <CardIndicador
          titulo="Ativos"
          valor={data.totais.ativos}
          corValor="text-green-600"
          onClick={undefined}
        />
        <CardIndicador
          titulo="Vagas Disponíveis"
          valor={data.totais.vagas}
          corValor={data.totais.vagas > 0 ? 'text-primary-600' : 'text-gray-400'}
          onClick={handleCardVagasClick}
          ativo={vagasFilter}
        />
        <CardIndicador
          titulo="Alunos Excedentes"
          valor={data.totais.excedente}
          corValor={data.totais.excedente > 0 ? 'text-red-600' : 'text-gray-400'}
          onClick={undefined}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredHorarios.map((h) => {
            const key = `${h.horario}|${h.label}`;
            const isExpanded = displayExpandedKeys.has(key);
            const cor = getCor(h.total_excedente, h.total_vagas);
            const badge = getBadge(h.total_excedente, h.total_vagas);

            return (
              <div key={key}>
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{h.horario.substring(0, 5)}</span>
                    <span className="text-sm text-gray-600">{h.label}</span>
                    <span className="text-xs text-gray-400">-- {badge.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <BarraProgressoVaga ativos={h.total_ativos} capacidade={h.total_capacidade} cor={cor} />
                      <span className="text-gray-500 w-14 text-right">{h.total_ativos}/{h.total_capacidade}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.className}`}>
                      {badge.text}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-3 pt-1 bg-gray-50 border-t border-gray-100 space-y-1">
                    {h.grupos.map((g) => {
                      const gCor = getCor(g.excedente, g.vagas);
                      const gBadge = getBadge(g.excedente, g.vagas);
                      return (
                        <div key={g.grupo_id} className="flex items-center justify-between py-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{g.nivel}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-500">{g.professor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!vagasFilter && <BarraProgressoVaga ativos={g.alunos_ativos} capacidade={g.capacidade} cor={gCor} />}
                            <span className="text-gray-500 w-14 text-right">{g.alunos_ativos}/{g.capacidade}</span>
                            <span className={`px-1.5 py-0.5 rounded font-medium ${gBadge.className}`}>
                              {gBadge.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filteredHorarios.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum horário encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
};

function CardIndicador({
  titulo,
  valor,
  corValor,
  onClick,
  ativo,
}: {
  titulo: string;
  valor: number;
  corValor: string;
  onClick?: () => void;
  ativo?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 shadow-sm transition ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${ativo ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-200'}`}
    >
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{titulo}</p>
      <p className={`text-2xl font-bold mt-1 ${corValor}`}>{valor}</p>
      <p className="text-[10px] text-gray-400 mt-2">Dados referentes às turmas filtradas</p>
    </div>
  );
}

export default Vagas;
