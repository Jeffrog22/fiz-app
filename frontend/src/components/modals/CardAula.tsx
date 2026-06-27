import React, { useState } from 'react';

interface Props {
  aberto: boolean;
  onClose: () => void;
}

const CardAula: React.FC<Props> = ({ aberto, onClose }) => {
  const [tempPiscina, setTempPiscina] = useState(28);
  const [cloro, setCloro] = useState(2.5);
  const [sensacao, setSensacao] = useState('Agradável');

  if (!aberto) return null;

  const statusSugerido =
    tempPiscina < 26 ? 'Água muito fria' : tempPiscina < 28 ? 'Água fria' : cloro < 1 || cloro > 5 ? 'Cloro inadequado' : 'Aula normal';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">CardAula</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Temp. Piscina</label>
            <input type="number" value={tempPiscina} onChange={(e) => setTempPiscina(Number(e.target.value))} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Cloro (ppm)</label>
            <input type="number" value={cloro} onChange={(e) => setCloro(Number(e.target.value))} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Sensação</label>
            <select value={sensacao} onChange={(e) => setSensacao(e.target.value)} className="w-full border rounded p-2">
              <option>Agradável</option>
              <option>Calor</option>
              <option>Frio</option>
              <option>Vento</option>
            </select>
          </div>
          <p className="text-sm font-medium">Sugestão: {statusSugerido}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default CardAula;
