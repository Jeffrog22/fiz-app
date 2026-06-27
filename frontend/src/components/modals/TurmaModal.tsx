import React, { useState } from 'react';
import api from '../../utils/api';

interface Props {
  aberto: boolean;
  onClose: () => void;
  onSalvo?: () => void;
}

const TurmaModal: React.FC<Props> = ({ aberto, onClose, onSalvo }) => {
  const [label, setLabel] = useState('');
  const [horario, setHorario] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

  const salvar = async () => {
    setSalvando(true);
    try {
      await api.post('/turmas', { label, horario });
      setLabel('');
      setHorario('');
      onClose();
      onSalvo && onSalvo();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Nova Turma</h2>
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="w-full border rounded p-2 mb-4"
          placeholder="Horário"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurmaModal;
