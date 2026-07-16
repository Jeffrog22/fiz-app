import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import AlunoModal from '../components/modals/AlunoModal';
import SearchInput from '../components/SearchInput';
import type { Aluno, Professor, SavePayload } from '../types';
import { calcIdade, calcCategoria, normalizeSearch } from '../utils/formatters';

interface SortRule {
  column: string;
  dir: 'asc' | 'desc';
}

const Alunos: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(searchParams.get('search') || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [professorAlocar, setProfessorAlocar] = useState('');
  const [turmaAlocar, setTurmaAlocar] = useState('');
  const [alocando, setAlocando] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [modoAlocacao, setModoAlocacao] = useState(false);
  const [lastSession, setLastSession] = useState({ genero: '', turmaId: '', professorId: '', nivel: '' });
  const [resetCounter, setResetCounter] = useState(0);

  const professorMap = new Map(professores.map((p) => [p.id, p.nome]));

  const turmasPorProfessor = useMemo(() =>
    professorAlocar
      ? turmas.filter((t: any) => t.professor_id === professorAlocar)
      : [],
    [turmas, professorAlocar]
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [alunosRes, profsRes, turmasRes] = await Promise.all([
        api.get('/alunos?ativo=true'),
        api.get('/professores'),
        api.get('/turmas'),
      ]);
      const turmaMap = new Map(turmasRes.data.map((t: any) => [t.grupo_id, t]));
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

  const getFilterValue = (a: any, col: string): string => {
    switch (col) {
      case 'nivel': return a.turma?.nivel || a.nivel || '-';
      case 'categoria': return calcCategoria(calcIdade(a.data_nascimento)) || '-';
      case 'turma': return a.turma?.label || '-';
      case 'horario': return (a.turma?.horario || '-').substring(0, 5);
      default: return '';
    }
  };

  const uniqueValues = useMemo(() => {
    const cols = ['nivel', 'categoria', 'turma', 'horario'];
    const result: Record<string, string[]> = {};
    for (const col of cols) {
      const set = new Set<string>();
      for (const a of alunos) set.add(getFilterValue(a, col));
      result[col] = Array.from(set).sort();
    }
    return result;
  }, [alunos]);

  const processed = useMemo(() => {
    let data = [...alunos];

    if (modoAlocacao) data = data.filter((a: any) => !a.turma_id);

    if (filtro) {
      const q = normalizeSearch(filtro);
      data = data.filter((a) =>
        normalizeSearch(a.nome).includes(q) ||
        normalizeSearch(a.turma?.nivel || '').includes(q) ||
        normalizeSearch(a.turma?.label || '').includes(q) ||
        normalizeSearch(a.turma?.horario || '').includes(q) ||
        normalizeSearch(professorMap.get(a.turma?.professor_id) || '').includes(q)
      );
    }

    for (const [col, val] of Object.entries(columnFilters)) {
      if (!val) continue;
      data = data.filter((a) => getFilterValue(a, col) === val);
    }

    for (let i = sortRules.length - 1; i >= 0; i--) {
      const { column, dir } = sortRules[i];
      data.sort((a, b) => {
        let va: any, vb: any;
        switch (column) {
          case 'nome': va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); break;
          case 'nivel': va = a.turma?.nivel || a.nivel || ''; vb = b.turma?.nivel || b.nivel || ''; break;
          case 'turma': va = a.turma?.label || ''; vb = b.turma?.label || ''; break;
          case 'horario': va = a.turma?.horario || ''; vb = b.turma?.horario || ''; break;
          case 'professor': va = professorMap.get(a.turma?.professor_id) || ''; vb = professorMap.get(b.turma?.professor_id) || ''; break;
          case 'idade': va = calcIdade(a.data_nascimento) ?? -1; vb = calcIdade(b.data_nascimento) ?? -1; break;
          case 'categoria': va = calcCategoria(calcIdade(a.data_nascimento)) || ''; vb = calcCategoria(calcIdade(b.data_nascimento)) || ''; break;
          case 'genero': va = a.genero || ''; vb = b.genero || ''; break;
          case 'status': va = a.turma_id ? 1 : 0; vb = b.turma_id ? 1 : 0; break;
          default: return 0;
        }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [alunos, filtro, columnFilters, sortRules, professorMap, modoAlocacao]);

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

      if (editando) {
        setModalOpen(false);
        setEditando(null);
      } else {
        setLastSession({
          genero: data.genero || '',
          turmaId: data.turma_id || '',
          professorId: turmas.find((t: any) => t.grupo_id === data.turma_id)?.professor_id || '',
          nivel: data.nivel || '',
        });
        setResetCounter((c) => c + 1);
      }
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Erro ao salvar aluno');
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState('falta');

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/alunos/${deleteTarget.id}?motivo=${deleteMotivo}`);
      setDeleteTarget(null);
      setDeleteMotivo('falta');
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
    if (selectedIds.size === processed.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processed.map((a: any) => a.id)));
    }
  };

  const handleAlocar = async () => {
    if (!turmaAlocar || selectedIds.size === 0) return;
    setAlocando(true);
    try {
      const turma = turmas.find((t: any) => t.grupo_id === turmaAlocar);
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
        {dir === 'asc' ? '▲' : '▼'}
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

  const thFilter = (col: string, label: string) => (
    <th className="px-3 py-2 align-top">
      <div className="flex flex-col gap-1">
        {thSort(col, label)}
        <select
          value={columnFilters[col] || ''}
          onChange={(e) =>
            setColumnFilters((f) => {
              const next = { ...f };
              if (e.target.value) next[col] = e.target.value;
              else delete next[col];
              return next;
            })
          }
          className={`text-xs border rounded px-1 py-0.5 max-w-[110px] ${
            columnFilters[col]
              ? 'bg-primary-50 border-primary-300 text-primary-700'
              : 'border-gray-200 text-gray-500'
          }`}
        >
          <option value="">{label}</option>
          {(uniqueValues[col] || []).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Alunos</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (modoAlocacao) { setSelectedIds(new Set()); setTurmaAlocar(''); setProfessorAlocar(''); }
              setModoAlocacao(!modoAlocacao);
            }}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              modoAlocacao
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {modoAlocacao ? 'Sair da Alocação' : 'Alocar'}
          </button>
          <button
            onClick={() => { setEditando(null); setModalOpen(true); }}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            + Novo Aluno
          </button>
        </div>
      </div>

      <SearchInput
        value={filtro}
        onChange={setFiltro}
        placeholder="Buscar por nome, nível, turma, horário ou professor..."
        className="w-full max-w-md"
      />

      {erro && !carregando && alunos.length === 0 && (
        <p className="text-sm text-red-500">{erro}</p>
      )}

      {modoAlocacao && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 border border-primary-200 rounded-md">
          <select
            value={professorAlocar}
            onChange={(e) => { setProfessorAlocar(e.target.value); setTurmaAlocar(''); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[140px]"
          >
            <option value="">Professor(a)</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <select
            value={turmaAlocar}
            onChange={(e) => setTurmaAlocar(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
            disabled={!professorAlocar}
          >
            <option value="">Turma + Horário</option>
            {turmasPorProfessor.map((t: any) => (
              <option key={t.grupo_id} value={t.grupo_id}>
                {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
              </option>
            ))}
          </select>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm font-medium text-primary-700 whitespace-nowrap">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
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
            </>
          )}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {modoAlocacao && (
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={processed.length > 0 && selectedIds.size === processed.length}
                      onChange={toggleSelecionarTodos}
                      className="rounded border-gray-300 text-primary-600"
                    />
                  </th>
                )}
                <th className="text-left px-3 py-2">{thSort('nome', 'Nome')}</th>
                {thFilter('nivel', 'Nível')}
                {thFilter('turma', 'Turma')}
                {thFilter('horario', 'Horário')}
                <th className="text-left px-3 py-2">{thSort('professor', 'Professor')}</th>
                <th className="text-left px-3 py-2">{thSort('idade', 'Idade')}</th>
                {thFilter('categoria', 'Categoria')}
                <th className="text-left px-3 py-2">{thSort('genero', 'Gênero')}</th>
                <th className="text-left px-3 py-2">{thSort('status', 'Status')}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processed.map((a: any) => {
                const idade = calcIdade(a.data_nascimento);
                const categoria = calcCategoria(idade);
                const status = a.turma_id ? '' : 'Pendente';
                const profNome = a.turma?.professor_id ? professorMap.get(a.turma.professor_id) : null;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    {modoAlocacao && (
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelecao(a.id)}
                          className="rounded border-gray-300 text-primary-600"
                        />
                      </td>
                    )}
                    <td
                      className="px-3 py-2 font-medium text-primary-600 cursor-pointer hover:text-primary-800"
                      title="clique para editar"
                      onClick={() => { setEditando(a); setModalOpen(true); }}
                    >
                      {a.nome}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{a.turma?.nivel || a.nivel || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.turma?.label || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{(a.turma?.horario || '-').substring(0, 5)}</td>
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
                      <button onClick={() => { setDeleteTarget({ id: a.id, nome: a.nome }); setDeleteMotivo('falta'); }}
                        className="text-xs text-red-500 hover:text-red-700">Remover</button>
                    </td>
                  </tr>
                );
              })}
              {processed.length === 0 && !carregando && (
                <tr>
                  <td colSpan={modoAlocacao ? 11 : 10} className="px-4 py-8 text-center text-gray-400">
                    Nenhum aluno encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800">Remover Aluno</h3>
            <p className="text-sm text-gray-600">
              Removendo: <strong>{deleteTarget.nome}</strong>
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Motivo da exclusão</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'falta', label: 'Falta' },
                  { value: 'desistencia', label: 'Desistência' },
                  { value: 'transferencia', label: 'Transferência' },
                  { value: 'documentacao', label: 'Documentação' },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setDeleteMotivo(m.value)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      deleteMotivo === m.value
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-sm px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      <AlunoModal
        open={modalOpen}
        aluno={editando}
        professores={professores}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        lastSession={lastSession}
        resetCounter={resetCounter}
      />
    </div>
  );
};

export default Alunos;
