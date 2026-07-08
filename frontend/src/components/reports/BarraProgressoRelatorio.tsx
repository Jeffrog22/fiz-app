import React from 'react';

interface Props {
  valor: number;
  max: number;
  cor: string;
  height?: string;
  showPercent?: boolean;
}

const BarraProgressoRelatorio: React.FC<Props> = ({ valor, max, cor, height = 'h-2.5', showPercent }) => {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-100 rounded-full ${height} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showPercent && <span className="text-xs font-medium text-gray-600 w-10 text-right">{pct.toFixed(0)}%</span>}
    </div>
  );
};

export default BarraProgressoRelatorio;
