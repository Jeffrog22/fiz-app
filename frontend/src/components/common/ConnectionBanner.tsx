import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const ConnectionBanner: React.FC = () => {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
      <span className="text-sm font-medium">
        Sem conexão com a internet — alterações não salvas podem ser perdidas.
      </span>
    </div>
  );
};

export default ConnectionBanner;
