import React, { useState } from 'react';
import type { Aluno } from '../../types';
import { formatarNomeMobile } from '../../utils/formatters';

interface Props {
  aberto: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  data: string;
  indiceAula: number;
  motivoAtual?: string;
  onSave: (alunoId: string, data: string, motivo: string) => void;
}

const MOTIVOS = [
  'Médico',
  'Atestado',
  'Falta justificada pelo responsável',
  'Problema familiar',
  'Questão de saúde',
  'Falta de transporte',
  'Condição climática',
  'Outro',
];

const JustificativaModal: React.FC<Props> = ({
  aberto, onClose, aluno, data, indiceAula, motivoAtual, onSave,
}) => {
  const [motivo, setMotivo] = useState(motivoAtual || MOTIVOS[0]);

  if (!aberto || !aluno) return null;

  const handleSave = () => {
    onSave(aluno.id, data, motivo);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl m-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Justificativa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {formatarNomeMobile(aluno.nome)} — {new Date(data + 'T12:00').toLocaleDateString('pt-BR')} — Aula {indiceAula + 1}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Motivo</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={handleSave}
            className="px-4 py-2 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600">Salvar</button>
        </div>
      </div>
    </div>
  );
};

export default JustificativaModal;
