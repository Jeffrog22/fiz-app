import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  HomeIcon,
  ChamadaIcon,
  TurmasIcon,
  VagasIcon,
  AlunosIcon,
  ExclusoesIcon,
  RelatoriosIcon,
  CalendarioIcon,
  BlocoNotasIcon,
  SettingsIcon,
  AjudaIcon,
  TransferenciasIcon,
} from '../icons/IconsColoridos';

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const links: SidebarLink[] = [
  { to: '/home', label: 'Início', icon: <HomeIcon /> },
  { to: '/chamadas', label: 'Chamadas', icon: <ChamadaIcon /> },
  { to: '/alunos', label: 'Alunos', icon: <AlunosIcon /> },
  { to: '/turmas', label: 'Turmas', icon: <TurmasIcon /> },
  { to: '/vagas', label: 'Vagas', icon: <VagasIcon /> },
  { to: '/exclusoes', label: 'Exclusões', icon: <ExclusoesIcon /> },
  { to: '/relatorios', label: 'Relatórios', icon: <RelatoriosIcon /> },
  { to: '/calendario', label: 'Calendário', icon: <CalendarioIcon /> },
  { to: '/bloco-de-notas', label: 'Bloco de notas', icon: <BlocoNotasIcon /> },
];

const linkTransferencia: SidebarLink = {
  to: '/transferencias-nivel',
  label: 'Transferência',
  icon: <TransferenciasIcon />,
};

const configLinks: SidebarLink[] = [
  { to: '/configuracoes', label: 'Configurações', icon: <SettingsIcon /> },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  aceitesNaoVistos?: number;
  lotesPendentes?: number;
}

const VISITANTE_ROTAS = ['/home', '/chamadas', '/alunos', '/turmas'];

const Sidebar: React.FC<Props> = ({ collapsed, onToggle, aceitesNaoVistos = 0, lotesPendentes = 0 }) => {
  const { isVisitante } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);

  // O link de Transferência só aparece logo após o Bloco de notas quando há lotes pendentes
  const linksVisiveis = React.useMemo(() => {
    const base = links.filter((link) => !isVisitante || VISITANTE_ROTAS.includes(link.to));
    if (!isVisitante && lotesPendentes > 0) {
      return [...base, linkTransferencia];
    }
    return base;
  }, [isVisitante, lotesPendentes]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setDeferredPrompt(null));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 50) {
      onToggle();
    }
  };

  return (
    <aside
      data-tour="sidebar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-r dark:border-gray-800 min-h-[calc(100vh-57px)] flex flex-col py-4 transition-all duration-300 ease-in-out overflow-hidden ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className={`flex items-center mb-4 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Menu</span>
        )}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-sm p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '\u25B6' : '\u25C0'}
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {linksVisiveis.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            data-tour={`nav-${link.to.replace('/', '')}`}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-2 ${collapsed ? 'py-1.5' : 'py-2'} rounded-md text-sm transition-colors whitespace-nowrap ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
          >
            {link.icon}
            <span
              className={`transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              }`}
            >
              {link.label}
            </span>
          {link.to === '/alunos' && !isVisitante && aceitesNaoVistos > 0 && (
            <span
              className={`bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 ${
                collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
              }`}
              title={`${aceitesNaoVistos} aluno(s) aceito(s) em outra unidade`}
            >
              {aceitesNaoVistos}
            </span>
          )}
          {link.to === '/transferencias-nivel' && !isVisitante && lotesPendentes > 0 && (
            <span
              className={`bg-purple-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 ${
                collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
              }`}
              title={`${lotesPendentes} lote(s) de transferência pendente(s) de aplicação`}
            >
              {lotesPendentes}
            </span>
          )}
          </NavLink>
        ))}
      </nav>

      {!isVisitante && <nav className="flex flex-col gap-1 px-2 pt-2 border-t border-gray-200 dark:border-t dark:border-gray-800 mt-2">
        {configLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            data-tour={`nav-${link.to.replace('/', '')}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 ${collapsed ? 'py-1.5' : 'py-2'} rounded-md text-sm transition-colors whitespace-nowrap ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
          >
            {link.icon}
            <span
              className={`transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              }`}
            >
              {link.label}
            </span>
          </NavLink>
        ))}
        <button
          type="button"
          data-tour="nav-ajuda"
          onClick={() => window.dispatchEvent(new CustomEvent('abrir-ajuda'))}
          title="Ajuda"
          className={`flex items-center gap-3 px-2 ${collapsed ? 'py-1.5' : 'py-2'} rounded-md text-sm transition-colors whitespace-nowrap w-full text-left ${
            collapsed ? 'justify-center' : ''
          } text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200`}
        >
          <AjudaIcon />
          <span
            className={`transition-all duration-300 ${
              collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
            }`}
          >
            Ajuda
          </span>
        </button>
      </nav>}

      {deferredPrompt && !isVisitante && (
        <div className="px-2 mt-2">
          <button
            onClick={handleInstall}
            className={`flex items-center gap-3 px-2 ${collapsed ? 'py-1.5' : 'py-2'} rounded-md text-sm transition-colors whitespace-nowrap w-full ${
              collapsed ? 'justify-center' : ''
            } text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200`}
            title="Instalar App"
          >
            <span className="text-[2rem] leading-none flex-shrink-0">{'\u2B07'}</span>
            <span
              className={`transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              }`}
            >
              Instalar App
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
