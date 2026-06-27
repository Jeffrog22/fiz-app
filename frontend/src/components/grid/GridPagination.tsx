import React from 'react';

interface GridPaginationProps {
  total?: number;
}

const GridPagination: React.FC<GridPaginationProps> = () => {
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>Paginação placeholder</span>
    </div>
  );
};

export default GridPagination;
