import React from 'react';

interface Props {
  titulo: string;
  valor?: string | number;
  corValor?: string;
  footer?: string;
  onClick?: () => void;
  ativo?: boolean;
  children?: React.ReactNode;
}

const CardIndicadorRelatorio: React.FC<Props> = ({ titulo, valor, corValor, footer, onClick, ativo, children }) => {
  return (
    <div
      className={`bg-white rounded-lg border p-4 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${ativo ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-200'}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{titulo}</p>
      {valor !== undefined && (
        <p className={`text-2xl font-bold mt-1 ${corValor || 'text-gray-800'}`}>{valor}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
      {footer && <p className="text-[10px] text-gray-400 mt-0.5">{footer}</p>}
    </div>
  );
};

export default CardIndicadorRelatorio;
