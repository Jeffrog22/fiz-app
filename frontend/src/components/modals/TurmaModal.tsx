import React, { useState, useEffect } from 'react';
import type { Turma } from '../../types';
import { mascaraHora } from '../../utils/formatters';

interface TurmaModalProps {
  open: boolean;
  turma?: Turma | null;
  professores: { id: string; nome: string }[];
  onSave: (data: Partial<Turma>) => void;
  onClose: () => void;
}

const TurmaModal: React.FC<TurmaModalProps> = ({
  open,
  turma,
  professores,
  onSave,
  onClose,
}) => {
  const [label, setLabel] = useState('');
  const [horario, setHorario] = useState('');
  const [nivel, setNivel] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState('');
  const [professorId, setProfessorId] = useState('');

  useEffect(() => {
    if (turma) {
      setLabel(turma.label);
      setHorario(turma.horario);
      setNivel(turma.nivel || '');
      setCapacidade(turma.capacidade?.toString() || '');
      setFaixaEtaria(turma.faixa_etaria || '');
      setProfessorId(turma.professor_id || '');
    } else {
      setLabel('');
      setHorario('');
      setNivel('');
      setCapacidade('');
      setFaixaEtaria('');
      setProfessorId('');
    }
  }, [turma, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label,
      horario,
      nivel: nivel || undefined,
      capacidade: capacidade ? parseInt(capacidade, 10) : undefined,
      faixa_etaria: faixaEtaria || undefined,
      professor_id: professorId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {turma ? 'Editar Turma' : 'Nova Turma'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nome da Turma</label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Horário</label>
            <input
              required
              type="text"
              inputMode="numeric"
              placeholder="HH:MM"
              value={horario}
              onChange={(e) => setHorario(mascaraHora(e.target.value))}
              maxLength={5}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nível</label>
            <input
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Professor</label>
            <select
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Capacidade</label>
            <input
              type="number"
              min={1}
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Faixa Etária</label>
            <input
              value={faixaEtaria}
              onChange={(e) => setFaixaEtaria(e.target.value)}
              placeholder="ex: 6-10 anos"
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TurmaModal;
