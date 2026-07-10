import React from 'react';
import CardIndicadorRelatorio from './CardIndicadorRelatorio';
import BarraProgressoRelatorio from './BarraProgressoRelatorio';
import { formatTime } from '../../utils/formatters';

interface Props {
  porNivel: Array<{ nivel: string; percentual: number; total: number }>;
  porHorario: Array<{ horario: string; percentual: number }>;
  porPeriodo: Array<{ periodo: string; percentual: number }>;
  porProfessor: Array<{ professor: string; percentual: number }>;
  topPresenca: Array<{ nome: string; presencas: number; total: number; taxa: number }>;
  topFaltas: Array<{ nome: string; faltas: number }>;
}

function BarraPercentual({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: string }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  const maxDisplay = Math.max(valor, max);
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <BarraProgressoRelatorio valor={max > 0 ? valor : 0} max={maxDisplay} cor={cor} />
    </div>
  );
}

const GridAnalitico: React.FC<Props> = ({
  porNivel,
  porHorario,
  porPeriodo,
  porProfessor,
  topPresenca,
  topFaltas,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CardIndicadorRelatorio titulo="Frequência por Nível">
        {(!porNivel || porNivel.length === 0) ? (
          <p className="text-xs text-gray-400">Sem dados no período.</p>
        ) : (
          <div className="space-y-2">
            {porNivel.slice(0, 10).map((item, i) => (
              <BarraPercentual
                key={i}
                label={item.nivel}
                valor={item.percentual}
                max={100}
                cor={item.percentual < 60 ? 'bg-blue-200' : 'bg-blue-400'}
              />
            ))}
          </div>
        )}
      </CardIndicadorRelatorio>

      <CardIndicadorRelatorio titulo="Frequência por Horário">
        {(!porHorario || porHorario.length === 0) ? (
          <p className="text-xs text-gray-400">Sem dados no período.</p>
        ) : (
          <div className="space-y-2">
            {porHorario.map((item, i) => (
              <BarraPercentual
                key={i}
                label={formatTime(item.horario)}
                valor={item.percentual}
                max={100}
                cor={item.percentual < 60 ? 'bg-cyan-300' : 'bg-cyan-500'}
              />
            ))}
          </div>
        )}
      </CardIndicadorRelatorio>

      <CardIndicadorRelatorio titulo="Frequência por Período">
        {(!porPeriodo || porPeriodo.length === 0) ? (
          <p className="text-xs text-gray-400">Sem dados no período.</p>
        ) : (
          <div className="space-y-2">
            {porPeriodo.map((item, i) => (
              <BarraPercentual
                key={i}
                label={item.periodo}
                valor={item.percentual}
                max={100}
                cor="bg-purple-500"
              />
            ))}
          </div>
        )}
      </CardIndicadorRelatorio>

      <CardIndicadorRelatorio titulo="Frequência por Professor">
        {(!porProfessor || porProfessor.length === 0) ? (
          <p className="text-xs text-gray-400">Sem dados no período.</p>
        ) : (
          <div className="space-y-2">
            {porProfessor.map((item, i) => (
              <BarraPercentual
                key={i}
                label={item.professor}
                valor={item.percentual}
                max={100}
                cor="bg-indigo-400"
              />
            ))}
          </div>
        )}
      </CardIndicadorRelatorio>

      <CardIndicadorRelatorio titulo="Top 5 Presença">
        {(!topPresenca || topPresenca.length === 0) ? (
          <p className="text-xs text-gray-400">Nenhum dado disponível.</p>
        ) : (
          <div className="space-y-2">
            {topPresenca.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate mr-2">
                  {i + 1}. {item.nome}
                </span>
                <span className="text-green-600 font-medium text-xs whitespace-nowrap">
                  {item.presencas}/{item.total} ({item.taxa.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardIndicadorRelatorio>

      <CardIndicadorRelatorio titulo="Top 5 Faltas">
        {(!topFaltas || topFaltas.length === 0) ? (
          <p className="text-xs text-gray-400">Nenhum dado disponível.</p>
        ) : (
          <div className="space-y-2">
            {topFaltas.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate mr-2">
                  {i + 1}. {item.nome}
                </span>
                <span className="text-red-600 font-medium text-xs whitespace-nowrap">
                  {item.faltas} faltas
                </span>
              </div>
            ))}
          </div>
        )}
      </CardIndicadorRelatorio>
    </div>
  );
};

export default GridAnalitico;
