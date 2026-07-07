import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../utils/api';
import SearchInput from '../components/SearchInput';
import { normalizeSearch } from '../utils/formatters';

interface Exclusao {
  id: string;
  aluno_id: string;
  motivo: string;
  data_exclusao: string;
  oculto: boolean;
  alunos: {
    id: string;
    nome: string;
    turma_id?: string;
    nivel?: string;
    contato?: string;
    ativo: boolean;
  };
}

interface Turma {
  id: string;
  grupo_id?: string;
  label: string;
  horario: string;
  professor_id?: string;
}

const Exclusoes: React.FC = () => {
  const [exclusoes, setExclusoes] = useState<Exclusao[]>([]);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [restoreModal, setRestoreModal] = useState<{ id: string; alunoNome: string } | null>(null);
  const [novaTurmaId, setNovaTurmaId] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [resExclusoes, resTurmas] = await Promise.all([
        api.get(`/exclusoes?mostrarOcultos=${mostrarOcultos}`),
        api.get('/turmas'),
      ]);
      setExclusoes(resExclusoes.data);
      setTurmas(resTurmas.data);
    } catch {
      setExclusoes([]);
    }
  }, [mostrarOcultos]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleRestaurar = async () => {
    if (!restoreModal) return;
    try {
      await api.post('/exclusoes/restaurar', {
        id: restoreModal.id,
        turma_id: novaTurmaId || undefined,
      });
      setRestoreModal(null);
      setNovaTurmaId('');
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao restaurar');
    }
  };

  const handleExcluirDefinitivo = async (id: string) => {
    if (!confirm('Tem certeza? Esta acao ocultara o aluno permanentemente.')) return;
    try {
      await api.delete(`/exclusoes/${id}`);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao excluir');
    }
  };

  const filtered = useMemo(() => {
    if (!filtro.trim()) return exclusoes;
    const q = normalizeSearch(filtro);
    return exclusoes.filter((exc) =>
      normalizeSearch(exc.alunos?.nome || '').includes(q)
    );
  }, [exclusoes, filtro]);

  const formatDate = (iso: string) => {
    if (!iso) return '---';
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Exclusões</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarOcultos}
            onChange={(e) => setMostrarOcultos(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          Mostrar alunos ocultos
        </label>
      </div>

      <SearchInput
        value={filtro}
        onChange={setFiltro}
        placeholder="Buscar por nome do aluno..."
        className="max-w-sm"
      />

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nível</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((exc) => (
              <tr key={exc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{exc.alunos?.nome || '---'}</td>
                <td className="px-4 py-3 text-gray-600">{exc.alunos?.turma_id ? turmas.find(t => (t.grupo_id || t.id) === exc.alunos.turma_id)?.label || exc.alunos.turma_id : '---'}</td>
                <td className="px-4 py-3 text-gray-600">{exc.alunos?.nivel || '---'}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{exc.motivo || '---'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(exc.data_exclusao)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRestoreModal({ id: exc.id, alunoNome: exc.alunos?.nome || 'Aluno' })}
                      className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleExcluirDefinitivo(exc.id)}
                      className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition"
                    >
                      Ocultar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma exclusão encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {restoreModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setRestoreModal(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800">Restaurar Aluno</h3>
            <p className="text-sm text-gray-600">Restaurando: <strong>{restoreModal.alunoNome}</strong></p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Turma de destino (opcional)</label>
              <select
                value={novaTurmaId}
                onChange={(e) => setNovaTurmaId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Turma original</option>
                {turmas.map((t) => (
                  <option key={t.grupo_id || t.id} value={t.grupo_id || t.id}>{t.label} - {t.horario}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setRestoreModal(null)} className="text-sm px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={handleRestaurar} className="text-sm px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Restaurar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exclusoes;
