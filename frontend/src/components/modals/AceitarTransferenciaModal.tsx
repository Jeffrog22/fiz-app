import React, { useEffect, useState, useMemo } from 'react';
import type { TransferenciaUnidade, Turma, Professor } from '../../types';
import { getTenantNome } from '../../utils/tenant';
import { calcIdade, sortTurmas } from '../../utils/formatters';

interface Props {
  open: boolean;
  transferencia: TransferenciaUnidade | null;
  turmas: Turma[];
  professores: Professor[];
  onAceitar: (turmaId: string | undefined, nivel: string | undefined) => void;
  onClose: () => void;
}

const AceitarTransferenciaModal: React.FC<Props> = ({ open, transferencia, turmas, professores, onAceitar, onClose }) => {
  const [professorId, setProfessorId] = useState('');
  const [turmaId, setTurmaId] = useState('');

  useEffect(() => {
    if (open) {
      setProfessorId('');
      setTurmaId('');
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

  if (!open || !transferencia) return null;

  const d = transferencia.dados_aluno;
  const idade = calcIdade(d.data_nascimento);

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Aceitar Transferencia</h3>

        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{d.nome}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            {idade != null && idade > 0 && <span>Idade: {idade} anos</span>}
            {d.genero && <span>Genero: {d.genero}</span>}
            {d.contato && <span>Contato: {d.contato}</span>}
            {d.turma_label && <span>Turma origem: {d.turma_label}</span>}
            {d.turma_horario && <span>Horario: {d.turma_horario}</span>}
            {d.turma_professor && <span>Professor: {d.turma_professor}</span>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Origem: <strong>{getTenantNome(transferencia.tenant_id)}</strong>
          </p>
          {transferencia.motivo && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Motivo: {transferencia.motivo}
            </p>
          )}
        </div>

        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Alocar na unidade destino</p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Professor(a)</label>
            <select
              value={professorId}
              onChange={(e) => { setProfessorId(e.target.value); setTurmaId(''); }}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm"
            >
              <option value="">Sem turma (Pendente)</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Turma + Horario</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm"
              disabled={!professorId}
            >
              <option value="">Selecione a turma</option>
              {turmasOrdenadas.map((t) => (
                <option key={t.grupo_id || t.id} value={t.grupo_id || t.id}>
                  {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nivel'})
                </option>
              ))}
            </select>
          </div>

          {turmaId && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nivel: <strong>{turmaSelecionada?.nivel || '-'}</strong>
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => onAceitar(turmaId || undefined, turmaSelecionada?.nivel || undefined)}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Aceitar e Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AceitarTransferenciaModal;
