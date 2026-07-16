import React from 'react';
import WeatherIcon from './WeatherIcon';
import { WMO_MAP } from '../../utils/climateEngine';

interface DiaClima {
  temp_min: number;
  temp_max: number;
  code: number;
}

interface Props {
  data: string;
  clima: DiaClima | null;
}

const WeatherWidget: React.FC<Props> = ({ data, clima }) => {
  if (!clima) return null;

  const condicao = WMO_MAP[clima.code] || 'Desconhecido';

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2.5 shadow-sm">
      <WeatherIcon weatherCode={clima.code} />
      <div className="text-sm">
        <span className="font-semibold text-gray-800">
          {Math.round(clima.temp_min)}° / {Math.round(clima.temp_max)}°
        </span>
        <span className="text-gray-400 mx-1.5">•</span>
        <span className="text-gray-500 capitalize">{condicao}</span>
      </div>
      <span className="text-[10px] text-gray-400 ml-auto">
        {new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
      </span>
    </div>
  );
};

export default WeatherWidget;
