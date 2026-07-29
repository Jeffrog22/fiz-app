import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { formatarNomeMobile } from '../../utils/formatters';
import type { Aluno, AnotacaoAluno } from '../../types';

interface Props {
  aberto: boolean;
  aluno: Aluno | null;
  onClose: () => void;
  onAnotacaoChange?: (alunoId: string) => void;
}

const AnotacoesModal: React.FC<Props> = ({ aberto, aluno, onClose, onAnotacaoChange }) => {
  const [anotacoes, setAnotacoes] = useState<AnotacaoAluno[]>([]);
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (aberto && aluno) {
      setNovaAnotacao('');
      setCarregando(true);
      api.post('/anotacoes/verificar-atestados').catch((e: any) =>
        console.error('Erro ao verificar atestados', e)
      ).finally(() => {
        api.get(`/anotacoes/aluno/${aluno.id}`)
          .then((res) => setAnotacoes(res.data || []))
          .catch(() => setAnotacoes([]))
          .finally(() => setCarregando(false));
      });
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

  const agendarSalvamento = useCallback((texto: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!aluno || !texto.trim()) return;
      setSalvando(true);
      try {
        const res = await api.post('/anotacoes', {
          aluno_id: aluno.id,
          anotacao: texto.trim(),
        });
        setAnotacoes((prev) => [res.data, ...prev]);
        setNovaAnotacao('');
        onAnotacaoChange?.(aluno.id);
      } catch (err) {
        console.error('Erro ao salvar anotacao', err);
      } finally {
        setSalvando(false);
      }
    }, 800);
  }, [aluno, onAnotacaoChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleRemover = async (id: string) => {
    try {
      await api.delete(`/anotacoes/${id}`);
      setAnotacoes((prev) => prev.filter((a) => a.id !== id));
      onAnotacaoChange?.(aluno?.id || '');
    } catch (err) {
      console.error('Erro ao remover anotacao', err);
    }
  };

  if (!aberto || !aluno) return null;

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

        <div className="flex-shrink-0 mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova anotação</label>
          <div className="flex gap-2">
            <textarea
              value={novaAnotacao}
              onChange={(e) => {
                setNovaAnotacao(e.target.value);
                agendarSalvamento(e.target.value);
              }}
              rows={2}
              placeholder="Digite e aguarde para salvar automaticamente..."
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-2 text-sm resize-none"
            />
          </div>
          {salvando && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Salvando...</p>}
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
