import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

interface WeatherData {
  ok: boolean;
  temperatura: number;
  temperaturaMin?: number;
  weatherCode: number;
  condicao: string;
  precipitacao: number;
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '\u2600\uFE0F';
  if (code === 1) return '\uD83C\uDF24\uFE0F';
  if (code === 2) return '\u26C5';
  if (code === 3) return '\u2601\uFE0F';
  if (code >= 45 && code <= 48) return '\uD83C\uDF2B\uFE0F';
  if (code >= 51 && code <= 67) return '\uD83C\uDF27\uFE0F';
  if (code >= 71 && code <= 77) return '\u2744\uFE0F';
  if (code >= 80 && code <= 82) return '\uD83C\uDF26\uFE0F';
  if (code >= 85 && code <= 86) return '\u2744\uFE0F';
  if (code >= 95) return '\u26A1';
  return '\u2601\uFE0F';
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetch() {
      try {
        const res = await api.get('/chamadas/clima');
        if (mounted) setWeather(res.data);
      } catch {
        if (mounted) setWeather(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetch();
    const interval = setInterval(fetch, 120 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
        <div className="w-10 h-4 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!weather || !weather.ok) {
    return (
      <div className="flex items-center gap-1 text-gray-400 text-sm" title="Clima indisponível">
        <span>\u2601\uFE0F</span>
        <span>--°C</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm" title={`${weather.condicao} - ${weather.temperatura}°C`}>
      <span className="text-base">{getWeatherIcon(weather.weatherCode)}</span>
      <span className="font-medium text-gray-700 tabular-nums">{Math.round(weather.temperatura)}°C</span>
      <span className="text-gray-400 hidden sm:inline text-xs">{weather.condicao}</span>
    </div>
  );
};

export default WeatherWidget;
