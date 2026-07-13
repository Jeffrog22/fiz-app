import React, { useState, useCallback, useEffect, useMemo } from 'react';
import api from '../utils/api';
import SearchInput from '../components/SearchInput';
import RestoreModal from '../components/modals/RestoreModal';
import type { Exclusao, Turma, Professor } from '../types';
import { normalizeSearch, formatDateBR } from '../utils/formatters';

const Exclusoes: React.FC = () => {
  const [exclusoes, setExclusoes] = useState<Exclusao[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; alunoNome: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [exclRes, turmasRes, profsRes] = await Promise.all([
        api.get(`/exclusoes?mostrarOcultos=${mostrarOcultos}`),
        api.get('/turmas'),
        api.get('/professores'),
      ]);
      setExclusoes(exclRes.data);
      setTurmas(turmasRes.data);
      setProfessores(profsRes.data);
    } catch (err: any) {
      setErro(err?.response?.data?.error || err.message || 'Erro ao carregar exclusões');
      setExclusoes([]);
    } finally {
      setCarregando(false);
    }
  }, [mostrarOcultos]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) carregar(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [carregar]);

  const turmaMap = useMemo(
    () => new Map(turmas.map((t) => [t.grupo_id || t.id, t])),
    [turmas],
  );

  const professorMap = useMemo(
    () => new Map(professores.map((p) => [p.id, p.nome])),
    [professores],
  );

  const handleRestore = async (turmaId: string) => {
    if (!restoreTarget) return;
    try {
      await api.post('/exclusoes/restaurar', {
        id: restoreTarget.id,
        turma_id: turmaId || undefined,
      });
      setRestoreTarget(null);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao restaurar');
    }
  };

  const handleOcultar = async (id: string) => {
    if (!confirm('Tem certeza? Esta ação ocultará o aluno permanentemente.')) return;
    try {
      await api.delete(`/exclusoes/${id}`);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao ocultar');
    }
  };

  const filtered = useMemo(() => {
    if (!filtro.trim()) return exclusoes;
    const q = normalizeSearch(filtro);
    return exclusoes.filter((exc) =>
      normalizeSearch(exc.alunos?.nome || '').includes(q),
    );
  }, [exclusoes, filtro]);

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

      {erro && !carregando && (
        <p className="text-sm text-red-500">{erro}</p>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Turma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Professor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((exc) => {
                const turma = exc.alunos?.turma_id
                  ? turmaMap.get(exc.alunos.turma_id)
                  : undefined;
                return (
                  <tr key={exc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {exc.alunos?.nome || '---'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {turma?.label || exc.alunos?.turma_id || '---'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(turma?.horario || '').slice(0, 5) || '---'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {turma?.professor_id ? professorMap.get(turma.professor_id) || '-' : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {exc.motivo || '---'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDateBR(exc.data_exclusao)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setRestoreTarget({
                              id: exc.id,
                              alunoNome: exc.alunos?.nome || 'Aluno',
                            })
                          }
                          className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition"
                        >
                          Restaurar
                        </button>
                        <button
                          onClick={() => handleOcultar(exc.id)}
                          className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition"
                        >
                          Ocultar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhuma exclusão encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <RestoreModal
        open={!!restoreTarget}
        alunoNome={restoreTarget?.alunoNome || ''}
        turmas={turmas}
        onRestore={handleRestore}
        onClose={() => setRestoreTarget(null)}
      />
    </div>
  );
};

export default Exclusoes;
