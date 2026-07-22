import React, { useEffect, useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useZoom } from '../hooks/useZoom';

const Configuracoes: React.FC = () => {
  const { permission, subscribed, loading } = usePushNotifications();
  const { zoom, aumentar, diminuir, resetar, ZOOM_MIN, ZOOM_MAX } = useZoom();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Configurações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Exportar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📤</span>
            <h2 className="text-lg font-semibold text-gray-700">Exportar</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Exporte dados de alunos, chamadas e turmas para planilha.
          </p>
          <button
            onClick={() => alert('Funcionalidade de exportação em breve.')}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Exportar Dados
          </button>
        </div>

        {/* Notificações */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔔</span>
            <h2 className="text-lg font-semibold text-gray-700">Notificações</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Gerencie as notificações push do navegador.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Status:{' '}
              {loading
                ? 'Verificando...'
                : permission === 'unsupported'
                ? 'Não suportado'
                : permission === 'granted' && subscribed
                ? 'Ativado'
                : permission === 'denied'
                ? 'Bloqueado'
                : 'Desativado'}
            </span>
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                loading
                  ? 'bg-yellow-400'
                  : permission === 'granted' && subscribed
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          </div>
        </div>

        {/* Tema */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎨</span>
            <h2 className="text-lg font-semibold text-gray-700">Tema</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Alterne entre o tema claro e escuro.
          </p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-focus:ring-2 peer-focus:ring-primary-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            <span className="ml-3 text-sm text-gray-600">
              {darkMode ? 'Escuro' : 'Claro'}
            </span>
          </label>
        </div>

        {/* Acessibilidade */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">♿</span>
            <h2 className="text-lg font-semibold text-gray-700">Acessibilidade</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Ajuste o zoom da interface para melhor visualização.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={diminuir}
              disabled={zoom <= ZOOM_MIN}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              A−
            </button>
            <button
              onClick={resetar}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Padrão
            </button>
            <button
              onClick={aumentar}
              disabled={zoom >= ZOOM_MAX}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              A+
            </button>
            <span className="text-sm text-gray-500 ml-1 w-10 text-right">{zoom}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
