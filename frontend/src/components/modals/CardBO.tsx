import React, { useState } from 'react';
import api from '../../utils/api';

interface Props {
  aberto: boolean;
  onClose: () => void;
  data: string;
  indiceAula: number;
  grupoId: string;
}

const CANCELAMENTO_TIPOS = new Set([
  'Médico pessoal',
  'Médico trabalho',
  'Particular',
  'Reunião',
  'Secretaria',
]);

const TIPOS_PESSOAIS = [
  'Médico pessoal',
  'Médico trabalho',
  'Particular',
  'Reunião',
  'Secretaria',
];

const TIPOS_GERAIS = [
  'Manutenção/Incidente',
  'Raios e Trovões',
  'Reunião',
];

const CardBO: React.FC<Props> = ({ aberto, onClose, data, indiceAula, grupoId }) => {
  const [isPessoal, setIsPessoal] = useState(true);
  const [comprometeDia, setComprometeDia] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_PESSOAIS[0]);
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

  const handleTogglePessoal = (v: boolean) => {
    setIsPessoal(v);
    setTipo(v ? TIPOS_PESSOAIS[0] : TIPOS_GERAIS[0]);
  };

  const tipos = isPessoal ? TIPOS_PESSOAIS : TIPOS_GERAIS;
  const isCancelamento = CANCELAMENTO_TIPOS.has(tipo);
  const via = isPessoal ? 'via_2' : 'via_1';

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await api.post('/chamadas/card-bo', {
        data,
        indice_aula: indiceAula,
        via,
        tipo_ocorrencia: tipo,
        motivo: descricao,
        compromete_dia: comprometeDia || undefined,
        grupo_id: grupoId,
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
          <h2 className="text-lg font-bold text-gray-800">Ocorrência / BO</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {new Date(data + 'T12:00').toLocaleDateString('pt-BR')} - Aula {indiceAula + 1}
        </p>
        <div className="space-y-4">

          <div className="flex items-center gap-2">
            <input type="checkbox" id="pessoalCheck" checked={isPessoal}
              onChange={(e) => handleTogglePessoal(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded" />
            <label htmlFor="pessoalCheck" className="text-sm font-medium text-gray-700">
              Pessoal / Professor
            </label>
            <span className="text-[10px] text-gray-400 ml-auto">
              {via === 'via_2' ? 'Exclusivo do professor' : 'Afeta todos os professores'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Escopo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="compromete" checked={!comprometeDia}
                  onChange={() => setComprometeDia(false)}
                  className="w-4 h-4 text-primary-600 border-gray-300" />
                Compromete a aula
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="compromete" checked={comprometeDia}
                  onChange={() => setComprometeDia(true)}
                  className="w-4 h-4 text-primary-600 border-gray-300" />
                Compromete o dia
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
              {tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {isCancelamento && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 space-y-1">
              <p>Este tipo de ocorrência irá <strong>cancelar a aula</strong> na matriz de chamada.</p>
              {comprometeDia && <p>O cancelamento será aplicado em todas as aulas do dia.</p>}
              <p className="text-red-500">
                {via === 'via_2'
                  ? 'Apenas as turmas deste professor serão afetadas (via_2).'
                  : 'Todas as turmas de todos os professores serão afetadas (via_1).'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
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
