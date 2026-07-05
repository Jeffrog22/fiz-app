import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import TurmaModal from '../components/modals/TurmaModal';
import SearchInput from '../components/SearchInput';
import { normalizeSearch } from '../utils/formatters';
import type { Turma } from '../types';

const Turmas: React.FC = () => {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Turma | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [resTurmas, resProf, resAlunos] = await Promise.all([
        api.get('/turmas'),
        api.get('/professores'),
        api.get('/alunos'),
      ]);
      const alunosPorTurma: Record<string, number> = {};
      for (const a of resAlunos.data) {
        if (a.turma_id) alunosPorTurma[a.turma_id] = (alunosPorTurma[a.turma_id] || 0) + 1;
      }
      setTurmas(resTurmas.data.map((t: any) => ({
        ...t,
        alunos_count: alunosPorTurma[t.grupo_id] || 0,
      })));
      setProfessores(resProf.data);
    } catch (err) {
      console.error('Erro ao carregar turmas', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) carregar(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [carregar]);

  const handleSave = async (data: any) => {
    try {
      if (editando) {
        await api.put(`/turmas/${editando.id}`, data);
      } else {
        await api.post('/turmas', data);
      }
      setModalOpen(false);
      setEditando(null);
      await carregar();
    } catch (err: any) {
      console.error('Erro ao salvar turma', err);
      const msg = err.response?.data?.error || 'Erro ao salvar turma';
      alert(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta turma?')) return;
    try {
      await api.delete(`/turmas/${id}`);
      await carregar();
    } catch (err) {
      console.error('Erro ao remover turma', err);
    }
  };

  const professorNome = (professorId?: string) =>
    professores.find((p) => p.id === professorId)?.nome || '-';

  const filtered = useMemo(() => turmas.filter((t) => {
    if (!filtro) return true;
    const q = normalizeSearch(filtro);
    return (
      normalizeSearch(t.label).includes(q) ||
      normalizeSearch(t.grupo_id || '').includes(q) ||
      normalizeSearch(t.horario || '').includes(q) ||
      normalizeSearch(t.nivel || '').includes(q) ||
      normalizeSearch(professorNome(t.professor_id)).includes(q)
    );
  }), [turmas, filtro]);

  const lotacaoClass = (count: number, cap?: number) => {
    if (!cap) return '';
    if (count > cap) return 'bg-red-100 text-red-700';
    if (count === cap) return 'bg-yellow-100 text-yellow-700';
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Turmas</h1>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          + Nova Turma
        </button>
      </div>

      <SearchInput
        value={filtro}
        onChange={setFiltro}
        placeholder="Buscar por turma, grupo ID, horário, nível ou professor..."
        className="w-full max-w-md"
      />

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Turma</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Horário</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Nível</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Faixa Etária</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Professor</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Lotação</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const alunosCount = t.alunos_count ?? 0;
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td
                      className="px-4 py-2 font-medium text-gray-800"
                      title={t.grupo_id || t.label}
                    >
                      {t.label}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{(t.horario || '').slice(0, 5)}</td>
                    <td className="px-4 py-2 text-gray-600">{t.nivel || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{t.faixa_etaria || '-'}</td>
                    <td className="px-4 py-2 text-gray-600">{professorNome(t.professor_id)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${lotacaoClass(alunosCount, t.capacidade)}`}
                      >
                        {alunosCount}/{t.capacidade || '∞'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        onClick={() => { setEditando(t); setModalOpen(true); }}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma turma encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <TurmaModal
        open={modalOpen}
        turma={editando}
        professores={professores}
        onSave={handleSave}
        onNavigateToAlunos={() => navigate('/alunos')}
        onClose={() => { setModalOpen(false); setEditando(null); }}
      />
    </div>
  );
};

export default Turmas;
