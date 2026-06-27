import React, { useState } from 'react';
import api from '../utils/api';

const Turmas: React.FC = () => {
  const [lista, setLista] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const response = await api.get('/turmas');
      setLista(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  React.useEffect(() => { carregar(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Turmas</h1>
      {carregando && <p className="text-sm text-gray-500">Carregando...</p>}
      <ul className="space-y-2">
        {lista.map((t) => (
          <li key={t.id} className="border rounded p-3">
            <p className="font-medium">{t.label}</p>
            <p className="text-xs text-gray-500">{t.horario} {t.nivel || ''}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Turmas;
