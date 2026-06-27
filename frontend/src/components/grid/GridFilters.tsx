import React from 'react';

const GridFilters: React.FC = () => {
  return (
    <div className="flex gap-2 mb-4">
      <input className="border rounded px-3 py-2 text-sm" placeholder="Buscar..." />
    </div>
  );
};

export default GridFilters;
