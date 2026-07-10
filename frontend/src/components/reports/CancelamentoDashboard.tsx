import React from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import CardIndicadorRelatorio from './CardIndicadorRelatorio';
import { formatTime } from '../../utils/formatters';
import type { CancelamentoDashboard as CancelamentoDashboardType } from '../../types';

interface Props {
  data: CancelamentoDashboardType | null;
  carregando: boolean;
  incluirJustificados: boolean;
  onToggleJustificados: () => void;
}

const CORES_PIE = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'];

const CancelamentoDashboard: React.FC<Props> = ({ data, carregando, incluirJustificados, onToggleJustificados }) => {
  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <p className="text-sm text-gray-400 text-center py-8">Nenhum dado disponível.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incluirJustificados}
            onChange={onToggleJustificados}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Incluir justificadas
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <CardIndicadorRelatorio
          titulo="Total Cancelamentos"
          valor={data.total}
          corValor="text-red-500"
        />
        <CardIndicadorRelatorio
          titulo="Motivo + Frequente"
          valor={data.motivoFrequente?.motivo || '—'}
          footer={`${data.motivoFrequente?.count || 0} ocorrências`}
          corValor="text-orange-500"
        />
        <CardIndicadorRelatorio
          titulo="Nível + Crítico"
          valor={data.nivelCritico?.nivel || '—'}
          footer={`${data.nivelCritico?.count || 0} cancelamentos`}
          corValor="text-blue-500"
        />
        <CardIndicadorRelatorio
          titulo="Mês Crítico"
          valor={data.mesCritico?.mes || '—'}
          footer={`${data.mesCritico?.count || 0} cancelamentos`}
          corValor="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data.evolucaoMensal && data.evolucaoMensal.length > 0) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={data.evolucaoMensal
                  .sort((a, b) => a.mes.localeCompare(b.mes))
                  .map((item) => ({ name: item.mes, cancelamentos: item.total }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cancelamentos"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {(data.distribuicaoMotivo && data.distribuicaoMotivo.length > 0) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Motivo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.distribuicaoMotivo
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 6)
                    .map((item, i) => ({
                      name: item.motivo,
                      value: item.total,
                      fill: item.cor || CORES_PIE[i % CORES_PIE.length],
                    }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }: any) =>
                    `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {data.distribuicaoMotivo.slice(0, 6).map((_, i) => (
                    <Cell
                      key={i}
                      fill={data.distribuicaoMotivo[i]?.cor || CORES_PIE[i % CORES_PIE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {(data.porNivel && data.porNivel.length > 0) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Nível</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                layout="vertical"
                data={data.porNivel
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8)
                  .map((item) => ({ name: item.nivel, cancelamentos: item.total }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="cancelamentos" fill="#F97316" name="Cancelamentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(data.porPeriodo && data.porPeriodo.length > 0) && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Por Período</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={data.porPeriodo.map((item) => ({ name: item.periodo, cancelamentos: item.total }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cancelamentos" fill="#8B5CF6" name="Cancelamentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.registros && data.registros.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Registros</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Horário</th>
                  <th className="py-2 pr-3">Nível</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="py-2">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {data.registros.slice(0, 50).map((r: any, i: number) => (
                  <tr key={r.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-700">{r.data || '-'}</td>
                    <td className="py-2 pr-3 text-gray-700">{formatTime(r.horario)}</td>
                    <td className="py-2 pr-3 text-gray-700">{r.nivel || '-'}</td>
                    <td className="py-2 pr-3 text-gray-700 capitalize">{r.motivo || '-'}</td>
                    <td className="py-2 text-gray-700">{r.tipo_select || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelamentoDashboard;
