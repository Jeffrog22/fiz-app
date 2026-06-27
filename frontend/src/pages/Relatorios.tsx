import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const Relatorios: React.FC = () => {
  const [dados, setDados] = useState<any[]>([]);

  useEffect(() => {
    api.get('/relatorios/frequencia').then((r) => setDados(r.data)).catch(() => setDados([]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Relatórios</h1>
      <pre className="text-xs bg-gray-100 p-3 rounded">{JSON.stringify(dados, null, 2)}</pre>
    </div>
  );
};

export default Relatorios;
