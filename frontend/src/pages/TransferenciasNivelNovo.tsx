import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import SearchInput from '../components/SearchInput';
import type { Aluno } from '../types';
import TransferenciaLoteReviewModal from '../components/modals/TransferenciaLoteReviewModal';
import { formatDateBR } from '../utils/formatters';

const TransferenciasNivelNovo: React.FC = () => {
  const navigate = useNavigate();
  const { isVisitante } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [modalAberto, setModalAberto] = useState(false);

  const carregarAlunos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await api.get('/api/alunos?ativo=true');
      setAlunos(res.data || []);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao carregar alunos');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarAlunos();
  }, [carregarAlunos]);

  const toggleSelecao = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelecionarTodos = () => {
    const filtrados = alunosFiltrados;
    if (selectedIds.size === filtrados.length && filtrados.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtrados.map((a: Aluno) => a.id)));
    }
  };

  const alunosFiltrados = useMemo(() => {
    const termo = filtro.toLowerCase();
    return alunos.filter((a) => a.nome.toLowerCase().includes(termo));
  }, [alunos, filtro]);

  const alunosSelecionados = alunosFiltrados.filter((a) => selectedIds.has(a.id));

  const abrirProgramacao = () => {
    if (alunosSelecionados.length === 0) {
      setErro('Selecione pelo menos um aluno');
      return;
    }
    setErro(null);
    setModalAberto(true);
  };

  const handleSucesso = () => {
    setSelectedIds(new Set());
    navigate('/transferencias-nivel');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Nova Programação de Transferência</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Selecione os alunos que serão transferidos. A origem de cada aluno é a matrícula atual; você escolhe apenas o destino.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/transferencias-nivel')}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          ← Voltar aos lotes
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {isVisitante && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            O modo Visitante não pode programar transferências.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <SearchInput
          value={filtro}
          onChange={setFiltro}
          placeholder="Buscar aluno por nome..."
          className="flex-1 max-w-md"
        />
        <button
          type="button"
          onClick={toggleSelecionarTodos}
          disabled={alunosFiltrados.length === 0 || isVisitante}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            selectedIds.size === alunosFiltrados.length && alunosFiltrados.length > 0
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          {selectedIds.size === alunosFiltrados.length && alunosFiltrados.length > 0
            ? 'Selecionar nenhum'
            : 'Selecionar todos'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                {selectedIds.size === alunosFiltrados.length && alunosFiltrados.length > 0 ? '✓' : '○'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Turma atual</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nível</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Horário</th>
            </tr>
          </thead>
          <tbody>
            {alunosFiltrados.map((aluno) => {
              const selecionado = selectedIds.has(aluno.id);
              return (
                <tr
                  key={aluno.id}
                  onClick={() => toggleSelecao(aluno.id)}
                  className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selecionado ? 'bg-primary-50 dark:bg-primary-900/20' : ''} border-b border-gray-100 dark:border-gray-700`}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={(e) => { e.stopPropagation(); toggleSelecao(aluno.id); }}
                      disabled={isVisitante}
                      className="w-4 h-4 rounded text-primary-600 dark:text-primary-400"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{aluno.nome}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{aluno.turma_id || 'Sem turma'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{aluno.nivel || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{aluno.turma?.horario?.slice(0, 5) || '—'}</td>
                </tr>
              );
            })}
            {alunosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum aluno encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {alunosSelecionados.length > 0 && !isVisitante && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {alunosSelecionados.length} aluno(s) selecionado(s)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              A origem de cada aluno será sua matrícula atual. Você escolhe apenas o destino.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirProgramacao}
            disabled={carregando}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            Programar transferência
          </button>
        </div>
      )}

      {alunosSelecionados.length === 0 && !isVisitante && (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
          Selecione alunos para programar a transferência.
        </div>
      )}

      <TransferenciaLoteReviewModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        alunosSelecionados={alunosSelecionados}
        onSucesso={handleSucesso}
      />
    </div>
  );
};

export default TransferenciasNivelNovo;
