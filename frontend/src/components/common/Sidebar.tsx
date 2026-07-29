import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarLink {
  to: string;
  label: string;
  icon: string;
}

const links: SidebarLink[] = [
  { to: '/home', label: 'Início', icon: '\uD83C\uDFE0' },
  { to: '/chamadas', label: 'Chamadas', icon: '\uD83D\uDCDD' },
  { to: '/alunos', label: 'Alunos', icon: '\uD83D\uDC65' },
  { to: '/turmas', label: 'Turmas', icon: '\uD83D\uDCDA' },
  { to: '/vagas', label: 'Vagas', icon: '\uD83D\uDCE6' },
  { to: '/exclusoes', label: 'Exclusões', icon: '\uD83D\uDDD1\uFE0F' },
  { to: '/relatorios', label: 'Relatórios', icon: '\uD83D\uDCCA' },
  { to: '/calendario', label: 'Calendário', icon: '\uD83D\uDCC5' },
];

const configLinks: SidebarLink[] = [
  { to: '/configuracoes', label: 'Configurações', icon: '\u2699\uFE0F' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<Props> = ({ collapsed, onToggle, mobileOpen, onMobileClose, isMobile }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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

  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 50 && dx < 0) {
      onMobileClose();
    }
  };

  if (isMobile) {
    return (
      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-[57px] left-0 h-[calc(100vh-57px)] z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-r dark:border-gray-800 flex flex-col py-4 transition-transform duration-300 ease-in-out overflow-hidden w-64 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-4 px-3">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Menu</span>
          <button
            onClick={onMobileClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors text-sm p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Fechar menu"
          >
            {'\u2716'}
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="text-lg flex-shrink-0">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <nav className="flex flex-col gap-1 px-2 pt-2 border-t border-gray-200 dark:border-t dark:border-gray-800 mt-2">
          {configLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="text-lg flex-shrink-0">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        {deferredPrompt && (
          <div className="px-2 mt-2">
            <button
              onClick={handleInstall}
              className="flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors w-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
              title="Instalar App"
            >
              <span className="text-lg flex-shrink-0">{'\u2B07'}</span>
              <span>Instalar App</span>
            </button>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
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

      <nav className="flex flex-col gap-1 px-2 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
          >
            <span className="text-lg flex-shrink-0">{link.icon}</span>
            <span
              className={`transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              }`}
            >
              {link.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <nav className="flex flex-col gap-1 px-2 pt-2 border-t border-gray-200 dark:border-t dark:border-gray-800 mt-2">
        {configLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }
          >
            <span className="text-lg flex-shrink-0">{link.icon}</span>
            <span
              className={`transition-all duration-300 ${
                collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
              }`}
            >
              {link.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {deferredPrompt && (
        <div className="px-2 mt-2">
          <button
            onClick={handleInstall}
            className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors whitespace-nowrap w-full ${
              collapsed ? 'justify-center' : ''
            } text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200`}
            title="Instalar App"
          >
            <span className="text-lg flex-shrink-0">{'\u2B07'}</span>
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
