import React from 'react';

const UNIDADES_ATIVAS = [
  { nome: 'Bela Vista', url: 'https://chamadabelavista.pages.dev' },
  { nome: 'São Matheus', url: 'https://chamadasaomatheus.pages.dev' },
  { nome: 'Vila', url: 'https://chamadavila.pages.dev' },
  { nome: 'Parque', url: 'https://chamadaparque.pages.dev' },
];

const UnidadeDesativada: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
        <span className="text-2xl" aria-hidden="true">🚫</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Unidade desativada</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        A unidade <strong>3ª Idade</strong> foi encerrada e não está mais disponível.
        Seus dados de acesso desta unidade não podem mais ser utilizados.
      </p>
      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        Acesse uma das unidades ativas:
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {UNIDADES_ATIVAS.map((unidade) => (
          <li key={unidade.nome}>
            <a
              href={unidade.url}
              className="text-primary-600 dark:text-primary-400 underline hover:text-primary-700 dark:hover:text-primary-300"
            >
              {unidade.nome}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default UnidadeDesativada;
