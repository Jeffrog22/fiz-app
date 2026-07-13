import React from 'react';

interface YearPickerProps {
  ano: number;
  onChange: (ano: number) => void;
}

const YearPicker: React.FC<YearPickerProps> = ({ ano, onChange }) => {
  const anos = Array.from({ length: 5 }, (_, i) => ano - 2 + i);

  return (
    <select
      value={ano}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white"
    >
      {anos.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
  );
};

export default YearPicker;
