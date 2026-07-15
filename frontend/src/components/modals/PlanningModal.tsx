import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import type { PlanejamentoBloco } from '../../types';

interface Props {
  data: string;
  onClose: () => void;
}

const PlanningModal: React.FC<Props> = ({ data, onClose }) => {
  const [tipos, setTipos] = useState<string[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);
  const [bloco, setBloco] = useState<PlanejamentoBloco | null>(null);
  const [indice, setIndice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/planejamento/tipos')
      .then((res) => setTipos(res.data || []))
      .catch(() => setTipos([]));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const carregarBloco = useCallback(async (tipo: string) => {
    setTipoSelecionado(tipo);
    setLoading(true);
    setBloco(null);
    setIndice(null);
    try {
      const res = await api.get('/planejamento/bloco', { params: { tipo, data } });
      setBloco(res.data?.bloco || null);
      setIndice(res.data?.indice || null);
    } catch {
      setBloco(null);
      setIndice(null);
    }
    setLoading(false);
  }, [data]);

  const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">Planejamento — {dataFormatada}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        {tipos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum tipo de planejamento disponível.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {tipos.map((t) => (
              <button
                key={t}
                onClick={() => carregarBloco(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tipoSelecionado === t
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 min-h-[80px]">
          {!tipoSelecionado && (
            <p className="text-sm text-gray-400">Selecione um tipo acima para ver o planejamento.</p>
          )}
          {tipoSelecionado && loading && (
            <p className="text-sm text-gray-500">Carregando...</p>
          )}
          {tipoSelecionado && !loading && bloco && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Bloco {indice || '?'} — {tipoSelecionado.charAt(0).toUpperCase() + tipoSelecionado.slice(1)}
              </p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                {bloco.conteudo}
              </pre>
            </div>
          )}
          {tipoSelecionado && !loading && !bloco && (
            <p className="text-sm text-gray-400">Nenhum bloco disponível para esta data.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningModal;
