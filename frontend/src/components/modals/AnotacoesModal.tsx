import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { formatarNomeMobile } from '../../utils/formatters';
import type { Aluno, AnotacaoAluno } from '../../types';

interface Props {
  aberto: boolean;
  aluno: Aluno | null;
  onClose: () => void;
  onAnotacaoChange?: (alunoId: string) => void;
  onAfastamento?: (alunoId: string, dias: number) => void;
}

const AnotacoesModal: React.FC<Props> = ({ aberto, aluno, onClose, onAnotacaoChange, onAfastamento }) => {
  const [anotacoes, setAnotacoes] = useState<AnotacaoAluno[]>([]);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const salvarAnotacao = useCallback(async (texto: string) => {
    if (!aluno || !texto.trim()) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await api.post('/anotacoes', {
        aluno_id: aluno.id,
        anotacao: texto.trim(),
      });
      setAnotacoes((prev) => [res.data, ...prev]);
      setNovaAnotacao('');
      onAnotacaoChange?.(aluno.id);
      setMensagem('Salvo!');
      setTimeout(() => setMensagem(null), 2000);

      const padraoAfastamento = /^(afastamento|afast|atestado|atest)\s+(\d+)\s*dias?$/i;
      const match = texto.trim().match(padraoAfastamento);
      if (match && onAfastamento) {
        const dias = parseInt(match[2], 10);
        onAfastamento(aluno.id, dias);
      }
    } catch (err) {
      console.error('Erro ao salvar anotacao', err);
      setMensagem('Erro ao salvar');
      setTimeout(() => setMensagem(null), 2000);
    } finally {
      setSalvando(false);
    }
  }, [aluno, onAnotacaoChange, onAfastamento]);

  useEffect(() => {
    if (!aberto && novaAnotacao.trim()) {
      salvarAnotacao(novaAnotacao);
    }
  }, [aberto, novaAnotacao, salvarAnotacao]);

  useEffect(() => {
    if (aberto && aluno) {
      setNovaAnotacao('');
      setMensagem(null);
      setCarregando(true);
      api.get(`/anotacoes/aluno/${aluno.id}`)
        .then((res) => setAnotacoes(res.data || []))
        .catch(() => setAnotacoes([]))
        .finally(() => setCarregando(false));
    }
  }, [aberto, aluno]);

  useEffect(() => {
    if (!aberto) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [aberto, onClose]);

  const handleRemover = async (id: string) => {
    try {
      await api.delete(`/anotacoes/${id}`);
      setAnotacoes((prev) => prev.filter((a) => a.id !== id));
      onAnotacaoChange?.(aluno?.id || '');
    } catch (err) {
      console.error('Erro ao remover anotacao', err);
    }
  };

  const diasRestantesAtestado = useCallback((data: string): number | null => {
    if (!data) return null;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = new Date(data); venc.setHours(0, 0, 0, 0);
    return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  if (!aberto || !aluno) return null;

  const atestadoDiff = aluno.atestado_medico && aluno.data_atestado ? diasRestantesAtestado(aluno.data_atestado) : null;
  const alertaAtestado = atestadoDiff !== null && atestadoDiff <= 60;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-xl dark:shadow-black/20 m-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Anotações: {formatarNomeMobile(aluno.nome)}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-xl">&times;</button>
        </div>

        {alertaAtestado && (
          <div className="flex-shrink-0 mb-3 p-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {atestadoDiff! >= 0
              ? `Alerta: atestado vence em ${atestadoDiff} dias (${new Date(aluno.data_atestado!).toLocaleDateString('pt-BR')})`
              : `Atestado vencido há ${Math.abs(atestadoDiff!)} dias (${new Date(aluno.data_atestado!).toLocaleDateString('pt-BR')})`}
          </div>
        )}

        <div className="flex-shrink-0 mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova anotação</label>
          <div className="flex gap-2">
            <textarea
              value={novaAnotacao}
              onChange={(e) => setNovaAnotacao(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  salvarAnotacao(novaAnotacao);
                }
              }}
              rows={2}
              placeholder="Enter para salvar, Shift+Enter para nova linha..."
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-2 text-sm resize-none"
            />
          </div>
          {salvando && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Salvando...</p>}
          {mensagem && !salvando && (
            <p className={`text-xs mt-1 ${mensagem === 'Salvo!' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {mensagem}
            </p>
          )}
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {carregando ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Carregando...</p>
          ) : anotacoes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhuma anotação registrada.</p>
          ) : (
            anotacoes.map((a) => (
              <div key={a.id}
                className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                    {new Date(a.criado_em + 'Z').toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {a.criado_por && ` — ${a.criado_por}`}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{a.anotacao}</p>
                </div>
                <button
                  onClick={() => handleRemover(a.id)}
                  className="flex-shrink-0 px-1.5 py-0.5 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                  title="Remover anotação"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnotacoesModal;
