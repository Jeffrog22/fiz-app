import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import CardStat from '../CardStat';
import type { PiscinaHistoricoData } from '../../../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

const TabPiscina: React.FC<{ mes: number; ano: number }> = ({ mes, ano }) => {
  const [data, setData] = useState<PiscinaHistoricoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/relatorios/piscina-historico', { params: { mes, ano } })
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mes, ano]);

  if (loading) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (!data || data.registros.length === 0) return <p className="text-sm text-gray-400">Nenhum registro encontrado.</p>;

  const chartData = data.registros.map((r) => ({
    dia: r.data.substring(8, 10),
    'Temp. Piscina': r.temperatura_piscina,
    'Temp. Externa': r.temperatura_externa,
    'Cloro': r.cloro_ppm,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <CardStat titulo="Média Temp. Piscina" valor={`${data.medias.temperatura_piscina}°C`} cor="text-blue-600" icon="🌡️" />
        <CardStat titulo="Média Temp. Externa" valor={`${data.medias.temperatura_externa}°C`} cor="text-orange-600" icon="☀️" />
        <CardStat titulo="Média Cloro" valor={`${data.medias.cloro_ppm}ppm`} cor="text-cyan-600" icon="🧪" />
        <CardStat titulo="Dias Frios (<25°C)" valor={data.dias_frios} cor="text-blue-500" icon="🥶" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Temperatura Diária</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" /><YAxis /><Tooltip /><Legend />
            <Line type="monotone" dataKey="Temp. Piscina" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="Temp. Externa" stroke="#f97316" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Cloro Diário</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="dia" /><YAxis /><Tooltip />
            <Bar dataKey="Cloro" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TabPiscina;
