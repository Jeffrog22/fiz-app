import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarLink {
  to: string;
  label: string;
}

const links: SidebarLink[] = [
  { to: '/home', label: 'Início' },
  { to: '/chamadas', label: 'Chamadas' },
  { to: '/alunos', label: 'Alunos' },
  { to: '/turmas', label: 'Turmas' },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/vagas', label: 'Vagas' },
  { to: '/exclusoes', label: 'Exclusões' },
  { to: '/calendario', label: 'Calendário' },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] flex flex-col py-4">
      <nav className="flex flex-col gap-1 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
