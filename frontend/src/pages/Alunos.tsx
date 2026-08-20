import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import AlunoModal from '../components/modals/AlunoModal';
import SearchInput from '../components/SearchInput';
import type { Aluno, Professor, SavePayload } from '../types';
import { calcIdade, calcIdadeDoAno, calcCategoria, normalizeSearch, sortTurmas, formatarNomeMobile, formatDateBR } from '../utils/formatters';
import { Pencil, Unlink, Trash2 } from 'lucide-react';

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
  const [modoTransferencia, setModoTransferencia] = useState(false);
  const [modoRematricula, setModoRematricula] = useState(false);
  const [rematriculando, setRematriculando] = useState(false);
  const [rematriculaJanela, setRematriculaJanela] = useState<{ inicio: string; fim: string } | null>(null);
  const [lastSession, setLastSession] = useState({ genero: '', turmaId: '', professorId: '', nivel: '' });
  const [resetCounter, setResetCounter] = useState(0);

  const hojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [professorTransferir, setProfessorTransferir] = useState('');
  const [turmaTransferir, setTurmaTransferir] = useState('');
  const [transferindo, setTransferindo] = useState(false);
  const [turmaOrigemFiltro, setTurmaOrigemFiltro] = useState('');

  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState<{
    inseridos: number;
    ignorados: number;
    erros: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const professorMap = new Map(professores.map((p) => [p.id, p.nome]));

  const turmasPorProfessor = useMemo(() =>
    professorAlocar
      ? sortTurmas(turmas.filter((t: any) => t.professor_id === professorAlocar))
      : [],
    [turmas, professorAlocar]
  );

  const turmasDestino = useMemo(() =>
    professorTransferir
      ? sortTurmas(turmas.filter((t: any) => t.professor_id === professorTransferir))
      : [],
    [turmas, professorTransferir]
  );

  const turmasOrdenadas = useMemo(() => sortTurmas(turmas), [turmas]);

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

  const carregarJanelaRematricula = useCallback(async () => {
    try {
      const res = await api.get('/calendario/periodo');
      if (res.data?.rematricula_inicio && res.data?.rematricula_fim) {
        setRematriculaJanela({ inicio: res.data.rematricula_inicio, fim: res.data.rematricula_fim });
      } else {
        setRematriculaJanela(null);
      }
    } catch {
      setRematriculaJanela(null);
    }
  }, []);

  useEffect(() => { carregarJanelaRematricula(); }, [carregarJanelaRematricula]);

  const janelaAberta = rematriculaJanela
    ? hojeLocal() >= rematriculaJanela.inicio && hojeLocal() <= rematriculaJanela.fim
    : false;

  const getFilterValue = (a: any, col: string): string => {
    switch (col) {
      case 'nivel': return a.turma?.nivel || a.nivel || '-';
      case 'categoria': return calcCategoria(calcIdadeDoAno(a.data_nascimento)) || '-';
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
    if (modoTransferencia && turmaOrigemFiltro) data = data.filter((a: any) => a.turma_id === turmaOrigemFiltro);
    if (modoRematricula) data = data.filter((a: any) => a.par_q !== true);

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
          case 'categoria': va = calcCategoria(calcIdadeDoAno(a.data_nascimento)) || ''; vb = calcCategoria(calcIdadeDoAno(b.data_nascimento)) || ''; break;
          case 'genero': va = a.genero || ''; vb = b.genero || ''; break;
          default: return 0;
        }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [alunos, filtro, columnFilters, sortRules, professorMap, modoAlocacao, modoTransferencia, modoRematricula, turmaOrigemFiltro]);

  const alunosNomes = useMemo(() => alunos.map((a: any) => a.nome), [alunos]);

  const temFiltro =
    !!filtro ||
    Object.keys(columnFilters).length > 0 ||
    modoAlocacao ||
    modoTransferencia ||
    modoRematricula;

  const handleSave = async ({ data, acao }: SavePayload) => {
    try {
      if (acao === 'duplicar') {
        await api.post('/alunos', { ...data, duplicar_cadastro: true });
      } else if (editando) {
        await api.put(`/alunos/${editando.id}`, { ...data, acao });
      } else {
        await api.post('/alunos', data);
      }

      if (acao === 'duplicar' || editando) {
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

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportando(true);
    try {
      const formData = new FormData();
      formData.append('csv', file);
      const { data } = await api.post('/alunos/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Erro ao importar CSV');
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [desalocarTarget, setDesalocarTarget] = useState<{ id: string; nome: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState('falta');

  const handleConfirmDesalocar = async () => {
    if (!desalocarTarget) return;
    try {
      await api.patch(`/alunos/${desalocarTarget.id}/desalocar`);
      setDesalocarTarget(null);
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || 'Erro ao desalocar aluno');
    }
  };

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
          acao: 'reativacao',
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

  const handleTransferir = async () => {
    if (!turmaTransferir || selectedIds.size === 0) return;
    setTransferindo(true);
    try {
      const turma = turmas.find((t: any) => t.grupo_id === turmaTransferir);
      for (const alunoId of selectedIds) {
        await api.put(`/alunos/${alunoId}`, {
          turma_id: turmaTransferir,
          nivel: turma?.nivel || null,
          acao: 'transferencia',
        });
      }
      setSelectedIds(new Set());
      setTurmaTransferir('');
      setProfessorTransferir('');
      setTurmaOrigemFiltro('');
      await carregar();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao transferir alunos');
    } finally {
      setTransferindo(false);
    }
  };

  const handleRematricular = async () => {
    if (selectedIds.size === 0) return;
    setRematriculando(true);
    try {
      const hoje = hojeLocal();
      for (const alunoId of selectedIds) {
        await api.put(`/alunos/${alunoId}`, {
          par_q: true,
          par_q_data: hoje,
          acao: 'rematricula',
        });
      }
      setSelectedIds(new Set());
      await carregar();
      await carregarJanelaRematricula();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao rematricular alunos');
    } finally {
      setRematriculando(false);
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
      <span className="ml-1 text-xs text-primary-600 dark:text-primary-400">
        {idx > 0 && <sup className="text-[10px]">{idx + 1}</sup>}
        {dir === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const thSort = (column: string, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-left text-sm whitespace-nowrap"
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
              ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 text-primary-700 dark:text-primary-300'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Alunos</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (modoAlocacao) { setSelectedIds(new Set()); setTurmaAlocar(''); setProfessorAlocar(''); }
              setModoTransferencia(false);
              setModoAlocacao(!modoAlocacao);
            }}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              modoAlocacao
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {modoAlocacao ? 'Sair da Alocação' : 'Alocar'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (modoTransferencia) { setSelectedIds(new Set()); setTurmaTransferir(''); setProfessorTransferir(''); setTurmaOrigemFiltro(''); }
              setModoAlocacao(false);
              setModoTransferencia(!modoTransferencia);
            }}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              modoTransferencia
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {modoTransferencia ? 'Sair da Transferência' : 'Transferir'}
          </button>
          <button
            type="button"
            disabled={!janelaAberta}
            onClick={() => {
              if (modoRematricula) { setSelectedIds(new Set()); }
              setModoAlocacao(false);
              setModoTransferencia(false);
              setModoRematricula(!modoRematricula);
            }}
            title={janelaAberta
              ? undefined
              : rematriculaJanela
                ? `Janela de rematrículas: ${formatDateBR(rematriculaJanela.inicio)} a ${formatDateBR(rematriculaJanela.fim)}`
                : 'Configure a janela de rematrículas no Calendário'}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              modoRematricula
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {modoRematricula ? 'Sair das Rematrículas' : 'Rematrículas'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importando}
            className="px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {importando ? 'Importando...' : '📥 Importar CSV'}
          </button>
          <button
            onClick={() => { setEditando(null); setModalOpen(true); }}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            + Novo Aluno
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchInput
          value={filtro}
          onChange={setFiltro}
          placeholder="Buscar por nome, nível, turma, horário ou professor..."
          className="flex-1 max-w-md"
        />
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {processed.length}
          {temFiltro ? ` de ${alunos.length} ` : ' '}
          aluno{processed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {erro && !carregando && alunos.length === 0 && (
        <p className="text-sm text-red-500 dark:text-red-400">{erro}</p>
      )}

      {modoAlocacao && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 rounded-md">
          <select
            value={professorAlocar}
            onChange={(e) => { setProfessorAlocar(e.target.value); setTurmaAlocar(''); }}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:dark:ring-primary-400 min-w-[140px]"
          >
            <option value="">Professor(a)</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <select
            value={turmaAlocar}
            onChange={(e) => setTurmaAlocar(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:dark:ring-primary-400 min-w-[180px]"
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
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300 whitespace-nowrap">
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
                className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Limpar
              </button>
            </>
          )}
        </div>
      )}

      {modoTransferencia && (
        <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 rounded-md flex-wrap">
          <select
            value={turmaOrigemFiltro}
            onChange={(e) => { setTurmaOrigemFiltro(e.target.value); setSelectedIds(new Set()); }}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:dark:ring-purple-400 min-w-[160px]"
          >
            <option value="">Turma atual (filtro)</option>
            {turmasOrdenadas.map((t: any) => (
              <option key={t.grupo_id} value={t.grupo_id}>
                {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
              </option>
            ))}
          </select>

          <span className="text-xs text-gray-400 dark:text-gray-500">→</span>

          <select
            value={professorTransferir}
            onChange={(e) => { setProfessorTransferir(e.target.value); setTurmaTransferir(''); }}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:dark:ring-purple-400 min-w-[140px]"
          >
            <option value="">Professor(a)</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <select
            value={turmaTransferir}
            onChange={(e) => setTurmaTransferir(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:dark:ring-purple-400 min-w-[180px]"
            disabled={!professorTransferir}
          >
            <option value="">Nova turma</option>
            {turmasDestino.map((t: any) => (
              <option key={t.grupo_id} value={t.grupo_id}>
                {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
              </option>
            ))}
          </select>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleTransferir}
                disabled={!turmaTransferir || transferindo}
                className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferindo ? 'Transferindo...' : 'Transferir'}
              </button>
              <button
                type="button"
                onClick={() => { setSelectedIds(new Set()); setTurmaTransferir(''); }}
                className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Limpar
              </button>
            </>
          )}
        </div>
      )}

      {modoRematricula && (
        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 rounded-md flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Alunos sem ParQ (aptidão): <strong className="text-emerald-700 dark:text-emerald-300">{processed.length}</strong>
          </span>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleRematricular}
                disabled={rematriculando}
                className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rematriculando ? 'Rematriculando...' : 'Rematricular selecionados'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Limpar
              </button>
            </>
          )}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {(modoAlocacao || modoTransferencia || modoRematricula) && (
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={processed.length > 0 && selectedIds.size === processed.length}
                      onChange={toggleSelecionarTodos}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400"
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
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {processed.map((a: any) => {
                const idade = calcIdade(a.data_nascimento);
                const categoria = calcCategoria(calcIdadeDoAno(a.data_nascimento));
                const profNome = a.turma?.professor_id ? professorMap.get(a.turma.professor_id) : null;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {(modoAlocacao || modoTransferencia || modoRematricula) && (
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelecao(a.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400"
                        />
                      </td>
                    )}
                    <td
                      className="px-3 py-2 font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:text-primary-800 dark:hover:text-primary-200"
                      title="clique para editar"
                      onClick={() => { setEditando(a); setModalOpen(true); }}
                    >
                      <span className="sm:hidden">{formatarNomeMobile(a.nome, alunosNomes)}</span>
                      <span className="hidden sm:inline">{a.nome}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.turma?.nivel || a.nivel || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.turma?.label || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{(a.turma?.horario || '-').substring(0, 5)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{profNome || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{idade !== null ? idade : '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{categoria || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {a.genero
                        ? a.genero.charAt(0).toUpperCase() + a.genero.slice(1).replace('-', ' ')
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setEditando(a); setModalOpen(true); }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 ml-1 inline-flex items-center align-middle" title="Editar"><Pencil size={16} /></button>
                      {a.turma_id && (
                        <button onClick={() => setDesalocarTarget({ id: a.id, nome: a.nome })}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 ml-1 inline-flex items-center align-middle" title="Desalocar"><Unlink size={16} /></button>
                      )}
                      <button onClick={() => { setDeleteTarget({ id: a.id, nome: a.nome }); setDeleteMotivo('falta'); }}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-1 inline-flex items-center align-middle" title="Remover"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
              {processed.length === 0 && !carregando && (
                <tr>
                  <td colSpan={modoAlocacao || modoTransferencia || modoRematricula ? 10 : 9} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nenhum aluno encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {desalocarTarget && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40" onClick={() => setDesalocarTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 border dark:border-gray-700 p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Desalocar Aluno</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Desalocando: <strong>{desalocarTarget.nome}</strong>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              O aluno será removido da turma atual e ficará como <strong>Pendente</strong>.
              O período de matrícula será encerrado.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDesalocarTarget(null)}
                className="text-sm px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDesalocar}
                className="text-sm px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
              >
                Confirmar Desalocação
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 border dark:border-gray-700 p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Remover Aluno</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Removendo: <strong>{deleteTarget.nome}</strong>
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Motivo da exclusão</label>
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
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
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
                className="text-sm px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
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

      {importResult && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40" onClick={() => setImportResult(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 border dark:border-gray-700 p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Importação Concluída</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-green-600 dark:text-green-400">{importResult.inseridos}</span> aluno(s) importados
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-amber-600 dark:text-amber-400">{importResult.ignorados}</span> ignorado(s) (já existentes)
              </p>
              {importResult.erros.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">{importResult.erros.length} erro(s):</p>
                  <ul className="text-xs text-red-500 dark:text-red-400 space-y-0.5 max-h-32 overflow-y-auto">
                    {importResult.erros.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setImportResult(null)}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alunos;
