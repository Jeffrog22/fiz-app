import React from 'react';

interface DataGridProps {
  linhas: any[];
  colunas: string[];
}

const DataGrid: React.FC<DataGridProps> = ({ linhas, colunas }) => {
  return (
    <div className="overflow-x-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {colunas.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-gray-600">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, idx) => (
            <tr key={idx} className="border-t">
              {colunas.map((col) => (
                <td key={col} className="px-3 py-2">{linha[col] as any}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;
