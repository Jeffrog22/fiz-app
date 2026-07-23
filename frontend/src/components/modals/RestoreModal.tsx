import React, { useEffect, useState, useMemo } from 'react';
import type { Turma, Professor } from '../../types';
import { sortTurmas } from '../../utils/formatters';

interface RestoreModalProps {
  open: boolean;
  alunoNome: string;
  turmas: Turma[];
  professores: Professor[];
  onRestore: (turmaId: string, transferenciaExterna?: boolean) => void;
  onClose: () => void;
}

const RestoreModal: React.FC<RestoreModalProps> = ({ open, alunoNome, turmas, professores, onRestore, onClose }) => {
  const [professorId, setProfessorId] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [transferenciaExterna, setTransferenciaExterna] = useState(false);

  useEffect(() => {
    if (open) {
      setProfessorId('');
      setTurmaId('');
      setTransferenciaExterna(false);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const turmasFiltradas = useMemo(() => {
    if (!professorId) return [];
    return turmas.filter((t) => t.professor_id === professorId);
  }, [turmas, professorId]);

  const turmasOrdenadas = useMemo(() => sortTurmas(turmasFiltradas), [turmasFiltradas]);

  const turmaSelecionada = turmas.find((t) => t.grupo_id === turmaId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800">Restaurar Aluno</h3>
        <p className="text-sm text-gray-600">
          Restaurando: <strong>{alunoNome}</strong>
        </p>

        <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-xs font-medium text-green-700">Turma de destino</p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Professor(a)</label>
            <select
              value={professorId}
              onChange={(e) => { setProfessorId(e.target.value); setTurmaId(''); }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Turma original</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Turma + Horário</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              disabled={!professorId}
            >
              <option value="">Selecione a turma</option>
              {turmasOrdenadas.map((t) => (
                <option key={t.grupo_id || t.id} value={t.grupo_id || t.id}>
                  {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500">
            Nível: <strong>{turmaSelecionada?.nivel || '-'}</strong>
          </p>

          {turmaId && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={transferenciaExterna}
                onChange={(e) => setTransferenciaExterna(e.target.checked)}
                className="rounded border-gray-300 text-primary-600"
              />
              Veio de outra piscina
            </label>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => onRestore(turmaId, transferenciaExterna || undefined)}
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
