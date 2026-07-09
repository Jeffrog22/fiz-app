import React from 'react';
import BarraProgressoRelatorio from './BarraProgressoRelatorio';
import TimeFilterToggle from './TimeFilterToggle';
import type { MetricasPorLabel } from '../../types';

interface Props {
  metrics: {
    diasConcluidos: number;
    diasPrevistos: number;
    aulasDadas: number;
    aulasPrevistas: number;
    porLabel: MetricasPorLabel[];
  } | null;
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

  const totalPrevisto = metrics.porLabel.reduce((a, b) => a + b.previsto, 0);
  const totalConcluido = metrics.porLabel.reduce((a, b) => a + b.concluido, 0);

  return (
    <div className="space-y-3">
      <TimeFilterToggle value={periodo} onChange={onPeriodoChange} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Dias de Aula</p>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            {metrics.diasConcluidos}
            <span className="text-sm text-gray-400 font-normal">/{metrics.diasPrevistos}</span>
          </p>
          <BarraProgressoRelatorio
            valor={metrics.diasConcluidos}
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

      {metrics.porLabel.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium mb-2">Detalhamento por Turma</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Label</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Semanas</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Turmas</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Previsto</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Concluído</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {metrics.porLabel.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium text-gray-700">{row.label}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{row.semanas}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{row.turmas}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{row.previsto}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{row.concluido}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`text-xs font-medium ${
                        row.previsto > 0 && row.concluido / row.previsto >= 0.9
                          ? 'text-green-600'
                          : row.previsto > 0 && row.concluido / row.previsto >= 0.7
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {row.previsto > 0 ? Math.round((row.concluido / row.previsto) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-gray-50">
                  <td className="py-2 px-2 text-gray-800">Total</td>
                  <td className="py-2 px-2 text-right text-gray-800" />
                  <td className="py-2 px-2 text-right text-gray-800" />
                  <td className="py-2 px-2 text-right text-gray-800">{totalPrevisto}</td>
                  <td className="py-2 px-2 text-right text-gray-800">{totalConcluido}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={`text-xs font-medium ${
                      totalPrevisto > 0 && totalConcluido / totalPrevisto >= 0.9
                        ? 'text-green-600'
                        : totalPrevisto > 0 && totalConcluido / totalPrevisto >= 0.7
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {totalPrevisto > 0 ? Math.round((totalConcluido / totalPrevisto) * 100) : 0}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrequencyMetrics;
