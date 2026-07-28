import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  color: string;
  group: 'main' | 'more';
}

const menuItems: MenuItem[] = [
  { label: 'Chamadas', path: '/chamadas', icon: '\uD83D\uDCDD', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200', group: 'main' },
  { label: 'Alunos', path: '/alunos', icon: '\uD83D\uDC65', color: 'bg-green-50 hover:bg-green-100 border-green-200', group: 'main' },
  { label: 'Turmas', path: '/turmas', icon: '\uD83D\uDCDA', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200', group: 'main' },
  { label: 'Calendário', path: '/calendario', icon: '\uD83D\uDCC5', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200', group: 'more' },
  { label: 'Exclusões', path: '/exclusoes', icon: '\uD83D\uDDD1\uFE0F', color: 'bg-red-50 hover:bg-red-100 border-red-200', group: 'more' },
  { label: 'Vagas', path: '/vagas', icon: '\uD83D\uDCE6', color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200', group: 'more' },
  { label: 'Relatórios', path: '/relatorios', icon: '\uD83D\uDCCA', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200', group: 'more' },
  { label: 'Configurações', path: '/configuracoes', icon: '\u2699\uFE0F', color: 'bg-gray-50 hover:bg-gray-100 border-gray-200', group: 'more' },
];

const DARK_COLORS: Record<string, string> = {
  'bg-blue-50 hover:bg-blue-100 border-blue-200': 'dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:border-blue-900',
  'bg-green-50 hover:bg-green-100 border-green-200': 'dark:bg-green-950/30 dark:hover:bg-green-900/40 dark:border-green-900',
  'bg-purple-50 hover:bg-purple-100 border-purple-200': 'dark:bg-purple-950/30 dark:hover:bg-purple-900/40 dark:border-purple-900',
  'bg-orange-50 hover:bg-orange-100 border-orange-200': 'dark:bg-orange-950/30 dark:hover:bg-orange-900/40 dark:border-orange-900',
  'bg-red-50 hover:bg-red-100 border-red-200': 'dark:bg-red-950/30 dark:hover:bg-red-900/40 dark:border-red-900',
  'bg-cyan-50 hover:bg-cyan-100 border-cyan-200': 'dark:bg-cyan-950/30 dark:hover:bg-cyan-900/40 dark:border-cyan-900',
  'bg-indigo-50 hover:bg-indigo-100 border-indigo-200': 'dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 dark:border-indigo-900',
  'bg-gray-50 hover:bg-gray-100 border-gray-200': 'dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700',
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const mainItems = menuItems.filter((m) => m.group === 'main');
  const moreItems = menuItems.filter((m) => m.group === 'more');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Menu Principal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mainItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 shadow-sm dark:shadow-black/20 transition-all ${item.color} ${DARK_COLORS[item.color] || ''}`}
            >
              <span className="text-4xl mb-3">{item.icon}</span>
              <span className="text-base font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Mais Opções</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moreItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 p-4 rounded-lg border shadow-sm dark:shadow-black/20 transition-all ${item.color} ${DARK_COLORS[item.color] || ''}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
