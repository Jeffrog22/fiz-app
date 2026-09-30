import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { buscarChangelog, type ChangelogVersao, type ChangelogSecao } from '../../utils/changelog';
import { compararVersoes } from '../../utils/version';

interface ReleaseNotesModalProps {
  aberto: boolean;
  onClose: () => void;
}

const BlocoVersao: React.FC<{ versao: ChangelogVersao; destaque: boolean }> = ({ versao, destaque }) => (
  <div className={`border-l-4 pl-3 ${destaque ? 'border-emerald-400' : 'border-gray-200 dark:border-gray-600'}`}>
    <div className="flex items-center gap-2 mb-1">
      <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{versao.version}</span>
      {versao.date && <span className="text-xs text-gray-400 dark:text-gray-500">{versao.date}</span>}
      {destaque && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          nova
        </span>
      )}
    </div>
    {versao.secoes.map((secao: ChangelogSecao, i: number) => (
      <div key={i} className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {secao.titulo}
        </p>
        <ul className="space-y-1 mt-0.5">
          {secao.itens.map((item, j) => (
            <li key={j} className="text-sm text-gray-700 dark:text-gray-300">
              {item.titulo}
              {item.detalhes.length > 0 && (
                <ul className="ml-4 mt-0.5 space-y-0.5">
                  {item.detalhes.map((d, k) => (
                    <li key={k} className="text-xs text-gray-500 dark:text-gray-400 list-disc">{d}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ aberto, onClose }) => {
  const [versoes, setVersoes] = useState<ChangelogVersao[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  const atual = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onClose]);

  useEffect(() => {
    if (!aberto || versoes !== null || carregando) return;
    setCarregando(true);
    buscarChangelog()
      .then((lista) => {
        if (lista && lista.length > 0) setVersoes(lista);
        else setErro(true);
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [aberto, versoes, carregando]);

  if (!aberto) return null;

  const novas = (versoes ?? []).filter((v) => compararVersoes(v.version, atual) > 0);
  const anteriores = (versoes ?? []).filter((v) => compararVersoes(v.version, atual) <= 0);
  const ultima = (versoes ?? [])[0];

  return (
    <div
      className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">📜 Novidades</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Seu app: {atual || '—'}
          {ultima ? ` · Última versão: ${ultima.version}` : ''}
        </p>

        {carregando && !versoes && (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Carregando...</p>
        )}

        {erro && (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
            Não foi possível carregar o resumo de alterações.
          </p>
        )}

        {versoes && !erro && (
          <>
            {novas.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Novidades desde a sua versão
                </p>
                {novas.map((v) => (
                  <BlocoVersao key={v.version} versao={v} destaque />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Você já está na versão mais recente.
              </p>
            )}

            {anteriores.length > 0 && (
              <details className="mt-5">
                <summary className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer select-none">
                  Versões anteriores ({anteriores.length})
                </summary>
                <div className="space-y-4 mt-3">
                  {anteriores.map((v) => (
                    <BlocoVersao key={v.version} versao={v} destaque={false} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReleaseNotesModal;
