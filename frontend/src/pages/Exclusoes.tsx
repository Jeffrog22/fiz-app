import React, { useState, useCallback, useEffect, useMemo } from 'react';
import api from '../utils/api';
import SearchInput from '../components/SearchInput';
import RestoreModal from '../components/modals/RestoreModal';
import type { Exclusao, Turma, Professor } from '../types';
import { normalizeSearch, formatDateBR } from '../utils/formatters';

interface SortRule {
  column: string;
  dir: 'asc' | 'desc';
}

const MOTIVOS = [
  { value: 'falta', label: 'Falta' },
  { value: 'desistencia', label: 'Desistência' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'documentacao', label: 'Documentação' },
];

const MOTIVO_MAP = new Map(MOTIVOS.map((m) => [m.value, m.label]));

const Exclusoes: React.FC = () => {
  const [exclusoes, setExclusoes] = useState<Exclusao[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; alunoNome: string } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoCampo, setEditandoCampo] = useState<'motivo' | 'data' | null>(null);
  const [editandoValor, setEditandoValor] = useState('');

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

  const [sortRules, setSortRules] = useState<SortRule[]>([]);

  const toggleSort = (column: string) => {
    setSortRules((prev) => {
      const idx = prev.findIndex((r) => r.column === column);
      if (idx === 0) {
        if (prev[0].dir === 'asc') return [{ column, dir: 'desc' }, ...prev.slice(1)];
        return prev.slice(1);
      }
      return [{ column, dir: 'asc' }, ...prev.filter((r) => r.column !== column)];
    });
  };

  const sortIcon = (column: string) => {
    const idx = sortRules.findIndex((r) => r.column === column);
    if (idx === -1) return null;
    const dir = sortRules[idx].dir;
    return (
      <span className="ml-1 text-xs text-primary-600">
        {idx > 0 && <sup className="text-[10px]">{idx + 1}</sup>}
        {dir === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  const thSort = (column: string, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="font-medium text-gray-500 hover:text-gray-700 text-left text-sm whitespace-nowrap"
    >
      {label}
      {sortIcon(column)}
    </button>
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

  const handleSalvarEdicao = async (id: string) => {
    try {
      await api.put(`/exclusoes/${id}`, {
        [editandoCampo!]: editandoValor,
      });
      setEditandoId(null);
      setEditandoCampo(null);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao salvar');
    }
  };

  const iniciarEdicao = (id: string, campo: 'motivo' | 'data', valorAtual: string) => {
    setEditandoId(id);
    setEditandoCampo(campo);
    setEditandoValor(valorAtual);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoCampo(null);
    setEditandoValor('');
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
    let data = exclusoes;
    if (filtro.trim()) {
      const q = normalizeSearch(filtro);
      data = data.filter((exc) =>
        normalizeSearch(exc.alunos?.nome || '').includes(q),
      );
    }

    data = data.map((exc) => {
      const turma = exc.alunos?.turma_id
        ? turmaMap.get(exc.alunos.turma_id)
        : undefined;
      return { ...exc, _turma: turma };
    });

    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { column, dir } = sortRules[i];
      data.sort((a: any, b: any) => {
        let va: any, vb: any;
        switch (column) {
          case 'nome': va = (a.alunos?.nome || '').toLowerCase(); vb = (b.alunos?.nome || '').toLowerCase(); break;
          case 'turma': va = a._turma?.label || ''; vb = b._turma?.label || ''; break;
          case 'horario': va = a._turma?.horario || ''; vb = b._turma?.horario || ''; break;
          case 'professor': va = a._turma?.professor_id ? professorMap.get(a._turma.professor_id) || '' : ''; vb = b._turma?.professor_id ? professorMap.get(b._turma.professor_id) || '' : ''; break;
          case 'motivo': va = a.motivo || ''; vb = b.motivo || ''; break;
          case 'data': va = a.data_exclusao || ''; vb = b.data_exclusao || ''; break;
          default: return 0;
        }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [exclusoes, filtro, sortRules, turmaMap, professorMap]);

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
                <th className="text-left px-4 py-3">{thSort('nome', 'Nome')}</th>
                <th className="text-left px-4 py-3">{thSort('turma', 'Turma')}</th>
                <th className="text-left px-4 py-3">{thSort('horario', 'Horário')}</th>
                <th className="text-left px-4 py-3">{thSort('professor', 'Professor')}</th>
                <th className="text-left px-4 py-3">{thSort('motivo', 'Motivo')}</th>
                <th className="text-left px-4 py-3">{thSort('data', 'Data')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((exc: any) => {
                const turma = exc._turma;
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
                    <td className="px-4 py-3">
                      {editandoId === exc.id && editandoCampo === 'motivo' ? (
                        <select
                          value={editandoValor}
                          onChange={(e) => setEditandoValor(e.target.value)}
                          onBlur={() => handleSalvarEdicao(exc.id)}
                          autoFocus
                          className="w-full px-1 py-0.5 text-sm border border-primary-400 rounded bg-white"
                        >
                          {MOTIVOS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded block capitalize text-gray-600"
                          onClick={() => iniciarEdicao(exc.id, 'motivo', exc.motivo || 'falta')}
                          title="Clique para editar"
                        >
                          {MOTIVO_MAP.get(exc.motivo) || exc.motivo || '---'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editandoId === exc.id && editandoCampo === 'data' ? (
                        <input
                          type="date"
                          value={editandoValor}
                          onChange={(e) => setEditandoValor(e.target.value)}
                          onBlur={() => handleSalvarEdicao(exc.id)}
                          autoFocus
                          className="w-full px-1 py-0.5 text-sm border border-primary-400 rounded bg-white"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded block text-gray-500 text-xs"
                          onClick={() => iniciarEdicao(exc.id, 'data', exc.data_exclusao?.split('T')[0] || '')}
                          title="Clique para editar"
                        >
                          {formatDateBR(exc.data_exclusao)}
                        </span>
                      )}
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
