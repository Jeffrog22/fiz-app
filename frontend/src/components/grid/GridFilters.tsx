import React from 'react';

interface GridFiltersProps {
  dataInicio: string;
  dataFim: string;
  turmaId: string;
  turmas: { id: string; label: string }[];
  onDataInicioChange: (v: string) => void;
  onDataFimChange: (v: string) => void;
  onTurmaChange: (v: string) => void;
}

const GridFilters: React.FC<GridFiltersProps> = ({
  dataInicio,
  dataFim,
  turmaId,
  turmas,
  onDataInicioChange,
  onDataFimChange,
  onTurmaChange,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Data Início</label>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => onDataInicioChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Data Fim</label>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => onDataFimChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">Turma</label>
        <select
          value={turmaId}
          onChange={(e) => onTurmaChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default GridFilters;
