import React from 'react';

interface Props {
  value: 'semana' | 'mes' | 'ano';
  onChange: (v: 'semana' | 'mes' | 'ano') => void;
}

const OPCOES: { value: 'semana' | 'mes' | 'ano'; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'ano', label: 'Ano' },
];

const TimeFilterToggle: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="flex gap-1">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.value}
          onClick={() => onChange(opcao.value)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            value === opcao.value
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
};

export default TimeFilterToggle;
