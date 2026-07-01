import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import AlunoModal from '../components/modals/AlunoModal';
import type { Aluno, Professor } from '../types';
import { mascaraTelefone } from '../utils/formatters';
import { calcIdade, calcCategoria } from '../utils/formatters';

const Alunos: React.FC = () => {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);

  const professorMap = new Map(professores.map((p) => [p.id, p.nome]));

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [alunosRes, profsRes] = await Promise.all([
        api.get('/alunos'),
        api.get('/professores'),
      ]);
      setAlunos(alunosRes.data);
      setProfessores(profsRes.data);
      if (alunosRes.data.length === 0) setErro('Nenhum aluno cadastrado');
    } catch (err: any) {
      console.error('Erro ao carregar alunos', err);
      setErro(err?.response?.data?.error || err.message || 'Erro ao carregar alunos');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSave = async (data: Partial<Aluno>) => {
    try {
      if (editando) {
        await api.put(`/alunos/${editando.id}`, data);
      } else {
        await api.post('/alunos', data);
      }
      setModalOpen(false);
      setEditando(null);
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Erro ao salvar aluno');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este aluno?')) return;
    try {
      await api.delete(`/alunos/${id}`);
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Erro ao remover aluno');
    }
  };

  const filtered = alunos.filter((a: any) => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      a.nome.toLowerCase().includes(q) ||
      (a.turma?.nivel || '').toLowerCase().includes(q) ||
      (a.turma?.label || '').toLowerCase().includes(q) ||
      (a.turma?.horario || '').toLowerCase().includes(q) ||
      (professorMap.get(a.turma?.professor_id) || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Alunos</h1>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          + Novo Aluno
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, nível, turma, horário ou professor..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full max-w-md px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {erro && !carregando && alunos.length === 0 && (
        <p className="text-sm text-red-500">{erro}</p>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Nome</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Nível</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Turma</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Horário</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Professor</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Idade</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Categoria</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Gênero</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a: any) => {
                const idade = calcIdade(a.data_nascimento);
                const categoria = calcCategoria(idade);
                const status = a.turma_id ? '' : 'Pendente';
                const profNome = a.turma?.professor_id ? professorMap.get(a.turma.professor_id) : null;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td
                      className="px-3 py-2 font-medium text-primary-600 cursor-pointer hover:text-primary-800"
                      title="clique para editar"
                      onClick={() => { setEditando(a); setModalOpen(true); }}
                    >
                      {a.nome}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{a.turma?.nivel || a.nivel || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.turma?.label || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.turma?.horario || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{profNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{idade !== null ? idade + ' anos' : '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{categoria || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {a.genero
                        ? a.genero.charAt(0).toUpperCase() + a.genero.slice(1).replace('-', ' ')
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {status === 'Pendente' ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          Pendente
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => { setEditando(a); setModalOpen(true); }}
                        className="text-xs text-primary-600 hover:text-primary-800">Editar</button>
                      <button onClick={() => handleDelete(a.id)}
                        className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !carregando && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Nenhum aluno encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AlunoModal
        open={modalOpen}
        aluno={editando}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditando(null); }}
      />
    </div>
  );
};

export default Alunos;
