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
  justificativas?: { data: string; motivo?: string }[];
  onSave: (alunoId: string, data: string, motivo: string, dias?: number) => void;
}

const MOTIVOS = [
  'Consulta médica',
  'Atestado',
  'Problema familiar',
  'Questão de saúde',
  'Falta de transporte',
  'Trabalho',
  'Outro',
];

const JustificativaModal: React.FC<Props> = ({
  aberto, onClose, aluno, data, indiceAula, motivoAtual, justificativas = [], onSave,
}) => {
  const [motivo, setMotivo] = useState(motivoAtual || MOTIVOS[0]);
  const [diasAtestado, setDiasAtestado] = useState('');

  if (!aberto || !aluno) return null;

  const handleSave = () => {
    const dias = motivo === 'Atestado' && diasAtestado.trim() !== '' ? parseInt(diasAtestado, 10) : undefined;
    onSave(aluno.id, data, motivo, dias && dias >= 1 ? dias : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl dark:shadow-black/20 m-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Justificativa</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-xl">&times;</button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {formatarNomeMobile(aluno.nome)} — {new Date(data + 'T12:00').toLocaleDateString('pt-BR')} — Aula {indiceAula + 1}
        </p>
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Justificativas do mês</p>
          {justificativas.length > 0 ? (
            <ul className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {justificativas.map((j) => (
                <li key={j.data} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/30 rounded px-2 py-1">
                  <span className="font-medium">{j.data.slice(8, 10)}/{j.data.slice(5, 7)}</span>
                  {j.motivo && <span className="truncate">{j.motivo}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Nenhuma justificativa registrada neste mês.</p>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-2 mt-1 text-sm">
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {motivo === 'Atestado' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Qtd. de dias (afastamento)</label>
              <input
                type="number"
                min={1}
                value={diasAtestado}
                onChange={(e) => setDiasAtestado(e.target.value)}
                placeholder="ex.: 5"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-2 mt-1 text-sm"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Conta os dias corridos a partir desta data e aplica J nos dias de aula.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">Cancelar</button>
          <button onClick={handleSave}
            className="px-4 py-2 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600">Salvar</button>
        </div>
      </div>
    </div>
  );
};

export default JustificativaModal;
