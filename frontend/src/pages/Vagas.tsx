import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const Vagas: React.FC = () => {
  const [lista, setLista] = useState<any[]>([]);

  useEffect(() => {
    api.get('/vagas').then((r) => setLista(r.data)).catch(() => setLista([]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Vagas</h1>
      <pre className="text-xs bg-gray-100 p-3 rounded">{JSON.stringify(lista, null, 2)}</pre>
    </div>
  );
};

export default Vagas;
