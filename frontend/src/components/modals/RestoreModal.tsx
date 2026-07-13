import React, { useEffect, useState } from 'react';
import type { Turma } from '../../types';

interface RestoreModalProps {
  open: boolean;
  alunoNome: string;
  turmas: Turma[];
  onRestore: (turmaId: string) => void;
  onClose: () => void;
}

const RestoreModal: React.FC<RestoreModalProps> = ({ open, alunoNome, turmas, onRestore, onClose }) => {
  const [novaTurmaId, setNovaTurmaId] = useState('');

  useEffect(() => {
    if (open) setNovaTurmaId('');
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800">Restaurar Aluno</h3>
        <p className="text-sm text-gray-600">
          Restaurando: <strong>{alunoNome}</strong>
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Turma de destino (opcional)</label>
          <select
            value={novaTurmaId}
            onChange={(e) => setNovaTurmaId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Turma original</option>
            {turmas.map((t) => (
              <option key={t.grupo_id || t.id} value={t.grupo_id || t.id}>
                {t.label} - {(t.horario || '').slice(0, 5)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => onRestore(novaTurmaId)}
            className="text-sm px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreModal;
