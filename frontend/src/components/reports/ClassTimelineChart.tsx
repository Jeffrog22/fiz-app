import React from 'react';
import { formatTime } from '../../utils/formatters';
import type { TimelineData } from '../../types';

interface Props {
  data: TimelineData | null;
  labelSelecionada: string;
  onLabelChange: (v: string) => void;
  professorId: string;
  onProfessorChange: (v: string) => void;
}

const ClassTimelineChart: React.FC<Props> = ({
  data,
  labelSelecionada,
  onLabelChange,
  professorId,
  onProfessorChange,
}) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <p className="text-sm text-gray-400 text-center py-8">Nenhum dado disponível.</p>
      </div>
    );
  }

  const hasSlots = data.slots && data.slots.length > 0;
  const maxTotal = hasSlots ? Math.max(...data.slots.map((s) => s.total), 1) : 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex gap-1 flex-wrap">
          {data.labels.map((label) => (
            <button
              key={label}
              onClick={() => onLabelChange(label)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                labelSelecionada === label
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {data.professores.map((prof) => (
            <button
              key={prof.id}
              onClick={() => onProfessorChange(prof.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                professorId === prof.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {prof.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {data.horarios.map((horario) => {
          const slot = hasSlots ? data.slots.find((s) => s.horario === horario) : undefined;
          const total = slot?.total || 0;
          return (
            <div key={horario} className="flex items-center gap-2">
              <span className="w-12 text-right text-xs text-gray-500 font-medium">
                {formatTime(horario)}
              </span>
              <div className="flex-1 flex h-6 bg-gray-100 rounded overflow-hidden">
                {slot && total > 0 ? (
                  <>
                    {slot.presentes > 0 && (
                      <div
                        className="flex items-center justify-center bg-green-400 text-[10px] text-white font-medium"
                        style={{ width: `${(slot.presentes / total) * 100}%` }}
                      >
                        {slot.presentes}
                      </div>
                    )}
                    {slot.ausentes > 0 && (
                      <div
                        className="flex items-center justify-center bg-red-400 text-[10px] text-white font-medium"
                        style={{ width: `${(slot.ausentes / total) * 100}%` }}
                      >
                        {slot.ausentes}
                      </div>
                    )}
                    {slot.justificados > 0 && (
                      <div
                        className="flex items-center justify-center bg-orange-400 text-[10px] text-white font-medium"
                        style={{ width: `${(slot.justificados / total) * 100}%` }}
                      >
                        {slot.justificados}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 bg-gray-100" />
                )}
              </div>
              <span className="w-8 text-right text-xs font-medium text-gray-600">
                {total}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="text-xs text-gray-500">Presente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-xs text-gray-500">Ausente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-xs text-gray-500">Justificado</span>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">Horários das turmas</p>
    </div>
  );
};

export default ClassTimelineChart;
