import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import AlunoModal from '../components/modals/AlunoModal';
import type { Aluno, Professor, SavePayload } from '../types';
import { calcIdade, calcCategoria } from '../utils/formatters';

const Alunos: React.FC = () => {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [turmaAlocar, setTurmaAlocar] = useState('');
  const [alocando, setAlocando] = useState(false);

  const professorMap = new Map(professores.map((p) => [p.id, p.nome]));

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [alunosRes, profsRes, turmasRes] = await Promise.all([
        api.get('/alunos'),
        api.get('/professores'),
        api.get('/turmas'),
      ]);
      const turmaMap = new Map(turmasRes.data.map((t: any) => [t.id, t]));
      setAlunos(alunosRes.data.map((a: any) => ({ ...a, turma: turmaMap.get(a.turma_id) || null })));
      setProfessores(profsRes.data);
      setTurmas(turmasRes.data);
      if (alunosRes.data.length === 0) setErro('Nenhum aluno cadastrado');
    } catch (err: any) {
      console.error('Erro ao carregar alunos', err);
      setErro(err?.response?.data?.error || err.message || 'Erro ao carregar alunos');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSave = async ({ data, acao }: SavePayload) => {
    try {
      if (editando) {
        await api.put(`/alunos/${editando.id}`, data);

        if (acao === 'transferencia') {
          const turmaId = data.turma_id || null;
          const nivel = (editando as any)?.turma?.nivel || data.nivel || null;
          await api.post(`/alunos/${editando.id}/enrollment`, {
            turma_id: turmaId,
            nivel,
            motivo: 'transferencia',
          });
        } else if (acao === 'correcao') {
          await api.post(`/alunos/${editando.id}/enrollment`, {
            turma_id: editando.turma_id || null,
            nivel: editando.nivel || null,
            motivo: 'correcao',
          });
        }
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

  const toggleSelecao = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelecionarTodos = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a: any) => a.id)));
    }
  };

  const handleAlocar = async () => {
    if (!turmaAlocar || selectedIds.size === 0) return;
    setAlocando(true);
    try {
      const turma = turmas.find((t: any) => t.id === turmaAlocar);
      for (const alunoId of selectedIds) {
        await api.put(`/alunos/${alunoId}`, {
          turma_id: turmaAlocar,
          nivel: turma?.nivel || null,
        });
        await api.post(`/alunos/${alunoId}/enrollment`, {
          turma_id: turmaAlocar,
          nivel: turma?.nivel || null,
          motivo: 'matricula_inicial',
        });
      }
      setSelectedIds(new Set());
      setTurmaAlocar('');
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao alocar alunos');
    } finally {
      setAlocando(false);
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 border border-primary-200 rounded-md">
          <span className="text-sm font-medium text-primary-700 whitespace-nowrap">
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <select
            value={turmaAlocar}
            onChange={(e) => setTurmaAlocar(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione a turma</option>
            {turmas.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAlocar}
            disabled={!turmaAlocar || alocando}
            className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {alocando ? 'Alocando...' : 'Alocar'}
          </button>
          <button
            type="button"
            onClick={() => { setSelectedIds(new Set()); setTurmaAlocar(''); }}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Limpar
          </button>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelecionarTodos}
                    className="rounded border-gray-300 text-primary-600"
                  />
                </th>
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
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelecao(a.id)}
                        className="rounded border-gray-300 text-primary-600"
                      />
                    </td>
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
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
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
        professores={professores}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditando(null); }}
      />
    </div>
  );
};

export default Alunos;
