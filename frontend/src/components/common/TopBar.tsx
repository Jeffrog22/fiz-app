import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

const TopBar: React.FC = () => {
  const { tenantNome } = useTenant();
  const { professorNome, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-primary-600">Fiz! App</h1>
        <span className="text-sm text-gray-400">|</span>
        <span className="text-sm text-gray-600">{tenantNome}</span>
      </div>
      <div className="flex items-center gap-4">
        {professorNome && (
          <span className="text-sm text-gray-600">{professorNome}</span>
        )}
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Sair
        </button>
      </div>
    </header>
  );
};

export default TopBar;
