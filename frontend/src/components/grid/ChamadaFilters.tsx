import React, { useMemo } from 'react';
import type { Turma } from '../../types';
import { formatMesAno, hojeMesAno } from '../../utils/chamadaUtils';

interface ChamadaFiltersProps {
  label: string;
  professorId: string;
  horario: string;
  nivel: string;
  mes: number;
  ano: number;
  turmas: Turma[];
  professores: { id: string; nome: string }[];
  retroativo: boolean;
  onLabelChange: (v: string) => void;
  onProfessorChange: (v: string) => void;
  onHorarioChange: (v: string) => void;
  onMesChange: (v: number) => void;
  onAnoChange: (v: number) => void;
  onRetroativoChange: (v: boolean) => void;
  onLimpar: () => void;
}

const ChamadaFilters: React.FC<ChamadaFiltersProps> = ({
  label,
  professorId,
  horario,
  nivel,
  mes,
  ano,
  turmas,
  professores,
  retroativo,
  onLabelChange,
  onProfessorChange,
  onHorarioChange,
  onMesChange,
  onAnoChange,
  onRetroativoChange,
  onLimpar,
}) => {
  const labelsUnicos = useMemo(() => {
    if (!professorId) return [];
    const set = new Set(
      turmas
        .filter((t) => t.professor_id === professorId && t.label)
        .map((t) => t.label)
    );
    return Array.from(set).sort();
  }, [turmas, professorId]);

  const professoresDisponiveis = useMemo(() => {
    return professores;
  }, [professores]);

  const horariosDisponiveis = useMemo(() => {
    if (!label || !professorId) return [];
    const set = new Set<string>();
    turmas
      .filter((t) => t.label === label && t.professor_id === professorId)
      .forEach((t) => { if (t.horario) set.add(t.horario); });
    return Array.from(set).sort();
  }, [label, professorId, turmas]);

  const temFiltro = label || professorId;

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
          <label className="text-xs text-gray-500 font-medium">Professor(a)</label>
          <select
            value={professorId}
            onChange={(e) => { onProfessorChange(e.target.value); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione</option>
            {professoresDisponiveis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Turma</label>
          <select
            value={label}
            onChange={(e) => { onLabelChange(e.target.value); }}
            disabled={!professorId}
            className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              !professorId ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-300'
            }`}
          >
            <option value="">{professorId ? 'Selecione' : 'Selecione um professor'}</option>
            {labelsUnicos.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Horário</label>
          <select
            value={horario}
            onChange={(e) => onHorarioChange(e.target.value)}
            disabled={!label || !professorId}
            className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              !label || !professorId ? 'bg-gray-50 text-gray-500 border-gray-200' : 'border-gray-300'
            }`}
          >
            <option value="">{label && professorId ? 'Selecione' : 'Selecione a turma'}</option>
            {horariosDisponiveis.map((h) => (
              <option key={h} value={h}>{h.substring(0, 5)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Nível</label>
          <input
            disabled
            value={nivel || '-'}
            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ChamadaFilters;
