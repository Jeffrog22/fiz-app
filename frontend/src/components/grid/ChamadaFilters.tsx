import React, { useMemo } from 'react';
import type { Turma } from '../../types';
import { formatMesAno, hojeMesAno } from '../../utils/chamadaUtils';

interface ChamadaFiltersProps {
  turmaId: string;
  professorId: string;
  horario: string;
  nivel: string;
  mes: number;
  ano: number;
  turmas: Turma[];
  professores: { id: string; nome: string }[];
  retroativo: boolean;
  onTurmaChange: (v: string) => void;
  onProfessorChange: (v: string) => void;
  onHorarioChange: (v: string) => void;
  onMesChange: (v: number) => void;
  onAnoChange: (v: number) => void;
  onRetroativoChange: (v: boolean) => void;
  onLimpar: () => void;
}

const ChamadaFilters: React.FC<ChamadaFiltersProps> = ({
  turmaId,
  professorId,
  horario,
  nivel,
  mes,
  ano,
  turmas,
  professores,
  retroativo,
  onTurmaChange,
  onProfessorChange,
  onHorarioChange,
  onMesChange,
  onAnoChange,
  onRetroativoChange,
  onLimpar,
}) => {
  const turmaSelecionada = turmas.find((t) => t.id === turmaId);

  const professoresDaTurma = useMemo(() => {
    if (!turmaId) return professores;
    const profId = turmaSelecionada?.professor_id;
    if (!profId) return [];
    const prof = professores.find((p) => p.id === profId);
    return prof ? [prof] : [];
  }, [turmaId, turmas, professores, turmaSelecionada]);

  const horariosDisponiveis = useMemo(() => {
    if (!turmaId) {
      const set = new Set<string>();
      turmas.forEach((t) => { if (t.horario) set.add(t.horario); });
      return Array.from(set).sort();
    }
    const t = turmaSelecionada;
    return t?.horario ? [t.horario] : [];
  }, [turmaId, turmas, turmaSelecionada]);

  const temFiltro = turmaId || professorId || horario;

  const hoje = hojeMesAno();
  const anos = [hoje.ano - 1, hoje.ano, hoje.ano + 1];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Período</label>
            <div className="flex gap-1">
              <select
                value={mes}
                onChange={(e) => onMesChange(Number(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{formatMesAno(m, ano)}</option>
                ))}
              </select>
              <select
                value={ano}
                onChange={(e) => onAnoChange(Number(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                {anos.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-1.5 mt-5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={retroativo}
              onChange={(e) => onRetroativoChange(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            Permitir lançamento retroativo
          </label>
        </div>

        {temFiltro && (
          <button
            onClick={onLimpar}
            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Turma</label>
          <select
            value={turmaId}
            onChange={(e) => { onTurmaChange(e.target.value); onProfessorChange(''); onHorarioChange(''); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Professor</label>
          <select
            value={professorId}
            onChange={(e) => onProfessorChange(e.target.value)}
            disabled={!!turmaId}
            className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              turmaId ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-300'
            }`}
          >
            <option value="">{turmaId ? (professoresDaTurma[0]?.nome || 'Auto') : 'Selecione'}</option>
            {!turmaId && professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Horário</label>
          <select
            value={horario}
            onChange={(e) => onHorarioChange(e.target.value)}
            disabled={!!turmaId}
            className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              turmaId ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-300'
            }`}
          >
            <option value="">{turmaId ? (horariosDisponiveis[0]?.substring(0, 5) || 'Auto') : 'Selecione'}</option>
            {!turmaId && horariosDisponiveis.map((h) => (
              <option key={h} value={h}>{h.substring(0, 5)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Nível</label>
          <input
            disabled
            value={nivel || (turmaSelecionada?.nivel || '')}
            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ChamadaFilters;
