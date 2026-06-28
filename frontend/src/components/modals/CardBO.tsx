import React, { useState } from 'react';
import api from '../../utils/api';
import type { Aluno } from '../../types';

interface Props {
  aberto: boolean;
  onClose: () => void;
  data: string;
  indiceAula: number;
  alunos?: Aluno[];
}

const tiposPessoal = ['Medico/particular/trabalho', 'Reuniao', 'Secretaria'];
const tiposGeral = ['Manutencao/Incidente', 'Raios e Trovoes', 'Reuniao'];

const CardBO: React.FC<Props> = ({ aberto, onClose, data, indiceAula, alunos }) => {
  const [escopo, setEscopo] = useState<'pessoal' | 'geral'>('pessoal');
  const [tipo, setTipo] = useState(tiposPessoal[0]);
  const [grupoId, setGrupoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

  const handleEscopoChange = (v: string) => {
    setEscopo(v as 'pessoal' | 'geral');
    setTipo(v === 'pessoal' ? tiposPessoal[0] : tiposGeral[0]);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await api.post('/chamadas/card-bo', {
        data,
        indice_aula: indiceAula,
        tipo_select: escopo,
        tipo_ocorrencia: tipo,
        motivo: descricao,
        grupo_id: escopo === 'pessoal' ? grupoId || undefined : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Ocorrencia / BO</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {new Date(data + 'T12:00').toLocaleDateString('pt-BR')} - Aula {indiceAula + 1}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Escopo</label>
            <select value={escopo} onChange={(e) => handleEscopoChange(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
              <option value="pessoal">Pessoal / Professor</option>
              <option value="geral">Geral</option>
            </select>
          </div>
          {escopo === 'pessoal' && alunos && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Aluno</label>
              <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
                <option value="">Selecionar aluno...</option>
                {alunos.map((a: Aluno) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
              {(escopo === 'pessoal' ? tiposPessoal : tiposGeral).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descricao</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
              rows={3} className="w-full border border-gray-300 rounded p-2 mt-1 text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvando}
            className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400">
            {salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
};

export default CardBO;
