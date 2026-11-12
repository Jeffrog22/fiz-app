import React from 'react';

/**
 * Demonstrações do guia visual.
 * São réplicas estáticas com dados fictícios: não criam, editam, programam
 * nem aplicam transferências (sem handlers e sem interação).
 */

const ROTULO_EXEMPLO = (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
    Exemplo
  </span>
);

const moldura = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-[11px] text-gray-600 dark:text-gray-300';

export const DemoAlunosSelecionados: React.FC = () => (
  <div className={`${moldura} pointer-events-none select-none`} aria-hidden>
    <div className="mb-1 flex items-center gap-2">
      <span className="font-semibold text-gray-700 dark:text-gray-200">Alunos</span>
      {ROTULO_EXEMPLO}
    </div>
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-gray-400 dark:text-gray-500">
          <th className="text-left py-0.5 font-normal">Aluno</th>
          <th className="text-left py-0.5 font-normal">Turma</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="py-0.5">☑ Alice Ramos</td>
          <td className="py-0.5">Iniciação · 08h</td>
        </tr>
        <tr>
          <td className="py-0.5">☑ Bruno Tavares</td>
          <td className="py-0.5">Iniciação · 08h</td>
        </tr>
        <tr>
          <td className="py-0.5">☐ Clara Nunes</td>
          <td className="py-0.5">Iniciação · 08h</td>
        </tr>
      </tbody>
    </table>
  </div>
);

export const DemoDestino: React.FC = () => (
  <div className={`${moldura} pointer-events-none select-none`} aria-hidden>
    <div className="mb-1 flex items-center gap-2">
      <span className="font-semibold text-gray-700 dark:text-gray-200">Destino</span>
      {ROTULO_EXEMPLO}
    </div>
    <p>
      <span className="block text-gray-400 dark:text-gray-500">Professor(a) de destino</span>
      Marina
    </p>
    <p className="mt-1">
      <span className="block text-gray-400 dark:text-gray-500">Turma / horário</span>
      Adaptação · 09h00
    </p>
  </div>
);

export const DemoPreviaChamada: React.FC = () => (
  <div className={`${moldura} pointer-events-none select-none`} aria-hidden>
    <div className="mb-1 flex items-center gap-2">
      <span className="font-semibold text-gray-700 dark:text-gray-200">Prévia de chamada · Dezembro</span>
      {ROTULO_EXEMPLO}
    </div>
    <p className="mb-1 text-gray-400 dark:text-gray-500">Marina → Adaptação → 09h00</p>
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-gray-400 dark:text-gray-500">
          <th className="text-left py-0.5 font-normal">Aluno</th>
          <th className="text-left py-0.5 font-normal">01/12</th>
          <th className="text-left py-0.5 font-normal">03/12</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="py-0.5">Alice Ramos · Entrada</td>
          <td className="py-0.5">—</td>
          <td className="py-0.5">—</td>
        </tr>
        <tr>
          <td className="py-0.5">Bruno Tavares · Entrada</td>
          <td className="py-0.5">—</td>
          <td className="py-0.5">—</td>
        </tr>
        <tr>
          <td className="py-0.5">Davi Castro</td>
          <td className="py-0.5">—</td>
          <td className="py-0.5">—</td>
        </tr>
      </tbody>
    </table>
  </div>
);

export const DemoAprovarAplicar: React.FC = () => (
  <div className={`${moldura} pointer-events-none select-none`} aria-hidden>
    <div className="mb-1 flex items-center gap-2">
      <span className="font-semibold text-gray-700 dark:text-gray-200">Confirmação</span>
      {ROTULO_EXEMPLO}
    </div>
    <p className="mb-1">
      <span className="block text-gray-400 dark:text-gray-500">Data efetiva</span>
      01/12/2026
    </p>
    <span className="inline-block px-2 py-1 rounded-md bg-primary-600 text-white font-medium">
      Aprovar e aplicar
    </span>
  </div>
);
