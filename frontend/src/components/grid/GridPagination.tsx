import React from 'react';

interface GridPaginationProps {
  indiceAtual: number;
  totalIndices: number;
  grupoId: string;
  onAnterior: () => void;
  onProximo: () => void;
}

const GridPagination: React.FC<GridPaginationProps> = ({
  indiceAtual,
  totalIndices,
  grupoId,
  onAnterior,
  onProximo,
}) => {
  return (
    <div className="flex items-center justify-between gap-x-0.5 bg-white px-4 py-3 rounded-lg border border-gray-200">
      <span className="text-sm text-gray-500 font-mono">
        {grupoId || `Turma ${indiceAtual + 1} de ${totalIndices}`}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onAnterior}
          disabled={indiceAtual <= 0}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        <button
          onClick={onProximo}
          disabled={indiceAtual >= totalIndices - 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Próximo
        </button>
      </div>
    </div>
  );
};

export default GridPagination;
