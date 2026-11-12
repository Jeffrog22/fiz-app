import { SVGProps } from 'react';

const CLASSE_ICONE = 'w-5 h-5';
const CLASSE_ICONE_GRANDE = 'w-12 h-12';

export function HomeIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" className="stroke-red-600 dark:stroke-red-400" />
    </svg>
  );
}

export function ChamadaIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M15 13a3 3 0 1 0-6 0" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" className="stroke-red-600 dark:stroke-red-400" />
      <circle cx="12" cy="8" r="2" className="stroke-gray-500 dark:stroke-gray-400" fill="none" />
    </svg>
  );
}

export function TurmasIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M5.254 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2V9.255" className="stroke-blue-600 dark:stroke-blue-400" />
      <circle cx="13" cy="15" r="3" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <path d="M17 22a4 4 0 0 0-8 0" className="stroke-gray-500 dark:stroke-gray-400" />
      <path d="M22 22A4 4 0 0 0 20.24 18.686 1 1 0 0 1 20.1 17.143 3 3 0 0 0 19.5 12.402" className="stroke-red-600 dark:stroke-red-400" fill="none" />
    </svg>
  );
}

export function VagasIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M3 12h10" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M3 8V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2v-3" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <path d="m9 16 4-4-4-4" className="stroke-gray-500 dark:stroke-gray-400" />
    </svg>
  );
}

export function AlunosIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M11.5 15H7a4 4 0 0 0-4 4v2" className="stroke-blue-600 dark:stroke-blue-400" fill="none" />
      <path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <circle cx="10" cy="7" r="4" className="stroke-gray-500 dark:stroke-gray-400" fill="none" />
    </svg>
  );
}

export function ExclusoesIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M10 11v6" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M14 11v6" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <path d="M3 6h18" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" className="stroke-gray-500 dark:stroke-gray-400" fill="none" />
    </svg>
  );
}

export function RelatoriosIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M12 16v5" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M16 14.639V21" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M20 10.656V21" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <path d="M4 18.463V21" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M8 14.656V21" className="stroke-gray-500 dark:stroke-gray-400" />
    </svg>
  );
}

export function CalendarioIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M8 2v3" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M16 2v3" className="stroke-blue-600 dark:stroke-blue-400" />
      <rect x="3" y="3" width="18" height="18" rx="2" className="stroke-blue-600 dark:stroke-blue-400" fill="none" />
      <path d="M3 9h18" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M8 13h.01" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M12 13h.01" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M16 13h.01" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M8 17h.01" className="stroke-gray-500 dark:stroke-gray-400" />
      <path d="M12 17h.01" className="stroke-gray-500 dark:stroke-gray-400" />
      <path d="M16 17h.01" className="stroke-gray-500 dark:stroke-gray-400" />
    </svg>
  );
}

export function BlocoNotasIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M15 3v5a1 1 0 0 0 1 1h5" className="stroke-blue-600 dark:stroke-blue-400" fill="none" />
      <path d="M18 15v6" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <path d="M21 12.356V9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.355" className="stroke-red-600 dark:stroke-red-400" fill="none" />
      <path d="M21 18h-6" className="stroke-gray-500 dark:stroke-gray-400" fill="none" />
    </svg>
  );
}

export function SettingsIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" className="stroke-blue-600 dark:stroke-blue-400" />
      <circle cx="12" cy="12" r="3" className="stroke-red-600 dark:stroke-red-400" fill="none" />
    </svg>
  );
}

export function AjudaIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M12 17h.01" className="stroke-gray-500 dark:stroke-gray-400" />
    </svg>
  );
}

export function TransferenciasIcon({ className, grande }: SVGProps<SVGSVGElement> & { className?: string; grande?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE} ${className ?? ''}`}
    >
      <path d="M13 11V5" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M11 7h4" className="stroke-blue-600 dark:stroke-blue-400" />
      <path d="M7 7h4" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M7 11V16" className="stroke-red-600 dark:stroke-red-400" />
      <path d="M11 16h4" className="stroke-gray-500 dark:stroke-gray-400" />
      <path d="M13 16V20" className="stroke-gray-500 dark:stroke-gray-400" />
    </svg>
  );
}
