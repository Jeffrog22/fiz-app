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
  { label: 'Calend\u00e1rio', path: '/calendario', icon: '\uD83D\uDCC5', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200', group: 'more' },
  { label: 'Exclus\u00f5es', path: '/exclusoes', icon: '\uD83D\uDDD1\uFE0F', color: 'bg-red-50 hover:bg-red-100 border-red-200', group: 'more' },
  { label: 'Relat\u00f3rios', path: '/relatorios', icon: '\uD83D\uDCCA', color: 'bg-teal-50 hover:bg-teal-100 border-teal-200', group: 'more' },
  { label: 'Vagas', path: '/vagas', icon: '\uD83D\uDCE6', color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200', group: 'more' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const mainItems = menuItems.filter((m) => m.group === 'main');
  const moreItems = menuItems.filter((m) => m.group === 'more');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Menu Principal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mainItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 shadow-sm transition-all ${item.color}`}
            >
              <span className="text-4xl mb-3">{item.icon}</span>
              <span className="text-base font-medium text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Mais Op\u00e7\u00f5es</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moreItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 p-4 rounded-lg border shadow-sm transition-all ${item.color}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
