import React from 'react';

interface PeriodPickerProps {
  mes: number;
  ano: number;
  onChange: (mes: number, ano: number) => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PeriodPicker: React.FC<PeriodPickerProps> = ({ mes, ano, onChange }) => {
  const anos = Array.from({ length: 5 }, (_, i) => ano - 2 + i);

  return (
    <div className="flex gap-2 items-center">
      <select
        value={mes}
        onChange={(e) => onChange(parseInt(e.target.value), ano)}
        className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
      >
        {MESES.map((nome, i) => (
          <option key={i + 1} value={i + 1}>{nome}</option>
        ))}
      </select>
      <select
        value={ano}
        onChange={(e) => onChange(mes, parseInt(e.target.value))}
        className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
      >
        {anos.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
};

export default PeriodPicker;
