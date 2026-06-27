import React, { useState } from 'react';

interface Props {
  aberto: boolean;
  onClose: () => void;
}

const CardBO: React.FC<Props> = ({ aberto, onClose }) => {
  const [escopo, setEscopo] = useState<'pessoal' | 'geral'>('pessoal');
  const [tipo, setTipo] = useState('Reunião');

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Ocorrência</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Escopo</label>
            <select value={escopo} onChange={(e) => setEscopo(e.target.value as any)} className="w-full border rounded p-2">
              <option value="pessoal">Pessoal/Professor</option>
              <option value="geral">Geral</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border rounded p-2">
              <option>Reunião</option>
              <option>Manutenção</option>
              <option>Outro</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default CardBO;
