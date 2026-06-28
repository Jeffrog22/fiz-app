import React, { useState, useEffect } from 'react';
import type { Aluno } from '../../types';

interface AlunoModalProps {
  open: boolean;
  aluno?: Aluno | null;
  onSave: (data: Partial<Aluno>) => void;
  onClose: () => void;
}

const AlunoModal: React.FC<AlunoModalProps> = ({ open, aluno, onSave, onClose }) => {
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [genero, setGenero] = useState('');
  const [contato, setContato] = useState('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome);
      setDataNascimento(aluno.data_nascimento || '');
      setGenero(aluno.genero || '');
      setContato(aluno.contato || '');
      setAtivo(aluno.ativo);
    } else {
      setNome('');
      setDataNascimento('');
      setGenero('');
      setContato('');
      setAtivo(true);
    }
  }, [aluno, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nome,
      data_nascimento: dataNascimento || undefined,
      genero: genero || undefined,
      contato: contato || undefined,
      ativo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {aluno ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Data de Nascimento</label>
            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Gênero</label>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Contato</label>
            <input
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="ativo" className="text-sm text-gray-600">Ativo</label>
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

export default AlunoModal;
