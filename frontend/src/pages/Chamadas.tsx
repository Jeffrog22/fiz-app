import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const Chamadas: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/chamadas/2026-06-27').then((r) => setLogs(r.data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Chamadas</h1>
      <pre className="text-xs bg-gray-100 p-3 rounded">{JSON.stringify(logs, null, 2)}</pre>
    </div>
  );
};

export default Chamadas;
