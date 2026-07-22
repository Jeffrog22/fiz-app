import React from 'react';
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
}

const Sidebar: React.FC<Props> = ({ collapsed, onToggle }) => {
  return (
    <aside
      className={`bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] flex flex-col py-4 transition-all duration-300 ease-in-out overflow-hidden ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div className={`flex items-center mb-4 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</span>
        )}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors text-sm p-1 rounded hover:bg-gray-100"
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
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

      <nav className="flex flex-col gap-1 px-2 pt-2 border-t border-gray-200 mt-2">
        {configLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
    </aside>
  );
};

export default Sidebar;
