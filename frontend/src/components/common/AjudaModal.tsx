import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import SearchInput from '../SearchInput';
import {
  PERGUNTAS_FREQUENTES,
  TOPICOS_AJUDA,
  buscarAjuda,
  type TopicoAjuda,
} from '../../data/ajuda';

interface AjudaModalProps {
  aberto: boolean;
  onClose: () => void;
}

const AjudaModal: React.FC<AjudaModalProps> = ({ aberto, onClose }) => {
  const [busca, setBusca] = useState('');
  const [topico, setTopico] = useState<TopicoAjuda | null>(null);
  const [indiceSlide, setIndiceSlide] = useState(0);
  const [faqAberta, setFaqAberta] = useState<number | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onClose]);

  const resultados = useMemo(() => buscarAjuda(busca), [busca]);

  if (!aberto) return null;

  const abrirTopico = (t: TopicoAjuda, slideIndex = 0) => {
    setTopico(t);
    setIndiceSlide(slideIndex);
    setBusca('');
  };

  const fecharTopico = () => {
    setTopico(null);
    setIndiceSlide(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!topico) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 50) {
      if (dx < 0 && indiceSlide < topico.slides.length - 1) setIndiceSlide((i) => i + 1);
      if (dx > 0 && indiceSlide > 0) setIndiceSlide((i) => i - 1);
    }
  };

  const slide = topico?.slides[indiceSlide];
  const ehUltimo = topico ? indiceSlide >= topico.slides.length - 1 : true;

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {topico && (
              <button
                type="button"
                onClick={fecharTopico}
                aria-label="Voltar aos tópicos"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
              {topico ? `${topico.icon} ${topico.titulo}` : '❓ Ajuda'}
            </h2>
            {topico && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {indiceSlide + 1} de {topico.slides.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tela 1: busca + tópicos + FAQ */}
        {!topico && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <SearchInput
              value={busca}
              onChange={setBusca}
              placeholder="Buscar funcionalidade ou dúvida..."
            />

            {busca.trim() ? (
              resultados.length > 0 ? (
                <ul className="space-y-1">
                  {resultados.map((r, i) => (
                    <li key={`${r.topico.id}-${r.slideIndex}-${i}`}>
                      <button
                        type="button"
                        onClick={() => abrirTopico(r.topico, r.slideIndex)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="mr-1.5">{r.topico.icon}</span>
                        <span className="font-medium">{r.topico.titulo}</span>
                        <span className="text-gray-400 dark:text-gray-500"> › </span>
                        {r.tituloSlide}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  Nada encontrado para “{busca}”. Tente outra palavra.
                </p>
              )
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOPICOS_AJUDA.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => abrirTopico(t)}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors text-center"
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
                        {t.titulo}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {t.slides.length} tópico{t.slides.length > 1 ? 's' : ''}
                      </span>
                    </button>
                  ))}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Perguntas frequentes
                  </h3>
                  <ul className="space-y-1">
                    {PERGUNTAS_FREQUENTES.map((p, i) => (
                      <li
                        key={i}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setFaqAberta(faqAberta === i ? null : i)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span>{p.pergunta}</span>
                          <ChevronRight
                            size={14}
                            className={`flex-shrink-0 text-gray-400 transition-transform ${
                              faqAberta === i ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        {faqAberta === i && (
                          <p className="px-3 pb-2 text-sm text-gray-600 dark:text-gray-400">
                            {p.resposta}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tela 2: carrossel */}
        {topico && slide && (
          <>
            {/* Indicadores */}
            <div className="flex justify-center gap-1.5 pt-3 flex-shrink-0">
              {topico.slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir para o tópico ${i + 1}`}
                  onClick={() => setIndiceSlide(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === indiceSlide
                      ? 'bg-primary-500'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Slide */}
            <div
              className="flex-1 overflow-y-auto p-5"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {slide.titulo}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {slide.texto}
              </p>
              {slide.dica && (
                <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>💡 Dica:</strong> {slide.dica}
                  </p>
                </div>
              )}
            </div>

            {/* Navegação */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIndiceSlide((i) => Math.max(0, i - 1))}
                disabled={indiceSlide === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              {ehUltimo ? (
                <button
                  type="button"
                  onClick={fecharTopico}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Concluir ✓
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIndiceSlide((i) => i + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Próximo <ChevronRight size={14} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AjudaModal;
