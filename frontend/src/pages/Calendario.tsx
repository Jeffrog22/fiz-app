import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const Calendario: React.FC = () => {
  const [eventos, setEventos] = useState<any[]>([]);

  useEffect(() => {
    api.get('/calendario').then((r) => setEventos(r.data)).catch(() => setEventos([]));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendário</h1>
      <pre className="text-xs bg-gray-100 p-3 rounded">{JSON.stringify(eventos, null, 2)}</pre>
    </div>
  );
};

export default Calendario;
