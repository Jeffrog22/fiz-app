import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import TurmaModal from '../components/modals/TurmaModal';
import type { Turma } from '../types';

const Turmas: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Turma | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resTurmas = await api.get('/turmas');
      setTurmas(resTurmas.data);
    } catch (err) {
      console.error('Erro ao carregar turmas', err);
    }
    try {
      const resProf = await api.get('/professores');
      setProfessores(resProf.data);
    } catch (err) {
      console.error('Erro ao carregar professores', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSave = async (data: Partial<Turma>) => {
    try {
      console.log('[DEBUG handleSave] método:', editando ? 'PUT' : 'POST', 'payload:', JSON.stringify(data));
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

  const filtered = turmas.filter((t) =>
    t.label.toLowerCase().includes(filtro.toLowerCase())
  );

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

      <input
        type="text"
        placeholder="Buscar por nome..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <th className="text-left px-4 py-2 font-medium text-gray-500">Professor</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Vagas</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{t.label}</td>
                  <td className="px-4 py-2 text-gray-600">{t.horario}</td>
                  <td className="px-4 py-2 text-gray-600">{t.nivel || '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{professorNome(t.professor_id)}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {t.capacidade ? `${t.capacidade} vagas` : '-'}
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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
        onClose={() => { setModalOpen(false); setEditando(null); }}
      />
    </div>
  );
};

export default Turmas;
