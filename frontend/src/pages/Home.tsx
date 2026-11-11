import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ChamadaIcon,
  AlunosIcon,
  TurmasIcon,
  CalendarioIcon,
  ExclusoesIcon,
  VagasIcon,
  RelatoriosIcon,
  SettingsIcon,
} from '../components/icons/IconsColoridos';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  group: 'main' | 'more';
}

const menuItems: MenuItem[] = [
  { label: 'Chamadas', path: '/chamadas', icon: <ChamadaIcon />, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200', group: 'main' },
  { label: 'Alunos', path: '/alunos', icon: <AlunosIcon />, color: 'bg-green-50 hover:bg-green-100 border-green-200', group: 'main' },
  { label: 'Turmas', path: '/turmas', icon: <TurmasIcon />, color: 'bg-purple-50 hover:bg-purple-100 border-purple-200', group: 'main' },
  { label: 'Calendário', path: '/calendario', icon: <CalendarioIcon />, color: 'bg-orange-50 hover:bg-orange-100 border-orange-200', group: 'more' },
  { label: 'Exclusões', path: '/exclusoes', icon: <ExclusoesIcon />, color: 'bg-red-50 hover:bg-red-100 border-red-200', group: 'more' },
  { label: 'Vagas', path: '/vagas', icon: <VagasIcon />, color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200', group: 'more' },
  { label: 'Relatórios', path: '/relatorios', icon: <RelatoriosIcon />, color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200', group: 'more' },
  { label: 'Configurações', path: '/configuracoes', icon: <SettingsIcon />, color: 'bg-gray-50 hover:bg-gray-100 border-gray-200', group: 'more' },
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
  const { isVisitante } = useAuth();
  const mainItems = menuItems.filter((m) => m.group === 'main');
  const moreItems = menuItems.filter((m) => m.group === 'more');

  return (
    <div className="space-y-8">
      {isVisitante && (
        <div className="p-4 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 rounded-lg">
          <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">Modo Visitante</p>
          <p className="text-xs text-sky-700 dark:text-sky-300">
            Você está visualizando dados com nomes fictícios. O acesso é somente leitura e expira em 2 horas.
          </p>
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Menu Principal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mainItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 shadow-sm dark:shadow-black/20 transition-all ${item.color} ${DARK_COLORS[item.color] || ''}`}
            >
              {item.icon}
              <span className="text-base font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!isVisitante && <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Mais Opções</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {moreItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 p-4 rounded-lg border shadow-sm dark:shadow-black/20 transition-all ${item.color} ${DARK_COLORS[item.color] || ''}`}
            >
              {item.icon}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
            </button>
          ))}
        </div>
      </div>}
    </div>
  );
};

export default Home;
