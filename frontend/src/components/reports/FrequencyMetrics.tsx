import React from 'react';
import BarraProgressoRelatorio from './BarraProgressoRelatorio';
import TimeFilterToggle from './TimeFilterToggle';

interface Props {
  metrics: { diasDeAula: number; diasPrevistos: number; aulasDadas: number; aulasPrevistas: number } | null;
  periodo: 'semana' | 'mes' | 'ano';
  onPeriodoChange: (v: 'semana' | 'mes' | 'ano') => void;
}

const FrequencyMetrics: React.FC<Props> = ({ metrics, periodo, onPeriodoChange }) => {
  if (!metrics) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TimeFilterToggle value={periodo} onChange={onPeriodoChange} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Dias de Aula</p>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            {metrics.diasDeAula}
            <span className="text-sm text-gray-400 font-normal">/{metrics.diasPrevistos}</span>
          </p>
          <BarraProgressoRelatorio
            valor={metrics.diasDeAula}
            max={metrics.diasPrevistos}
            cor="bg-blue-400"
            showPercent
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Aulas Dadas</p>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            {metrics.aulasDadas}
            <span className="text-sm text-gray-400 font-normal">/{metrics.aulasPrevistas}</span>
          </p>
          <BarraProgressoRelatorio
            valor={metrics.aulasDadas}
            max={metrics.aulasPrevistas}
            cor="bg-green-400"
            showPercent
          />
        </div>
      </div>
    </div>
  );
};

export default FrequencyMetrics;
