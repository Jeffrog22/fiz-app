import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useDbStatus } from '../../hooks/useDbStatus';
import WeatherWidget from './WeatherWidget';

const TopBar: React.FC = () => {
  const { tenantNome } = useTenant();
  const { professorNome, logout } = useAuth();
  const dbStatus = useDbStatus();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-primary-600">Fiz! App</h1>
        <span className="text-sm text-gray-400">|</span>
        <span className="text-xs text-gray-400">Piscina:</span>
        <span className="text-sm text-gray-600">{tenantNome}</span>
      </div>
      <div className="flex items-center gap-4">
        <WeatherWidget />
        {professorNome && (
          <span className="text-sm text-gray-600">{professorNome}</span>
        )}
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Sair
        </button>
        <div className="flex items-center gap-1.5 ml-1 select-none" title={dbStatus === 'online' ? 'Banco online' : dbStatus === 'checking' ? 'Verificando...' : 'Banco offline'}>
          <span className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-400' : dbStatus === 'checking' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
          <span className="text-[10px] text-gray-500">{__APP_VERSION__}</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
