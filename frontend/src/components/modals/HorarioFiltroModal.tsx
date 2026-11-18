import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface HorarioFiltroModalProps {
  open: boolean;
  horarios: string[];
  selecionados: Set<string>;
  onConfirm: (selecionados: string[]) => void;
  onClose: () => void;
}

const HorarioFiltroModal: React.FC<HorarioFiltroModalProps> = ({
  open, horarios, selecionados, onConfirm, onClose,
}) => {
  const [rascunho, setRascunho] = useState<Set<string>>(new Set(selecionados));

  useEffect(() => {
    setRascunho(new Set(selecionados));
  }, [selecionados]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const toggleRascunho = (valor: string) => {
    setRascunho((prev) => {
      const next = new Set(prev);
      if (next.has(valor)) next.delete(valor);
      else next.add(valor);
      return next;
    });
  };

  const limparRascunho = () => {
    setRascunho(new Set());
  };

  const handleConfirmar = () => {
    onConfirm([...rascunho]);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Horários</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-2">
          {horarios.map((h) => (
            <label
              key={h}
              className="flex items-center gap-2 px-2 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={rascunho.has(h)}
                onChange={() => toggleRascunho(h)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400"
              />
              <span className="text-xs">{h}</span>
            </label>
          ))}
          {horarios.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nenhum horário disponível.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
          <button
            type="button"
            onClick={limparRascunho}
            className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-100 dark:border-red-900/30 transition-colors"
          >
            Limpar seleção
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            className="text-xs bg-primary-600 text-white rounded px-3 py-1 hover:bg-primary-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HorarioFiltroModal;
