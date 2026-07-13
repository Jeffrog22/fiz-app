import React from 'react';

interface CardStatProps {
  titulo: string;
  valor: number | string;
  cor?: string;
  icon?: string;
}

const CardStat: React.FC<CardStatProps> = ({ titulo, valor, cor, icon }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{titulo}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold mt-1 ${cor || 'text-gray-800'}`}>{valor}</p>
    </div>
  );
};

export default CardStat;
