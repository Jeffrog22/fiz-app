import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Joyride } from 'react-joyride';
import { useGuiaVisual } from '../../hooks/useGuiaVisual';
import type { PassoGuia } from '../../data/guiaVisual';

const COR_OVERLAY = 'rgba(10, 23, 61, 0.53)';
const COR_CONTORNO = '#77bcff';
const MARGEM_CARTAO = 16;
const MARGEM_BOTAO = 24;

interface PosicaoCartao {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
}

function ehCelular(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

/**
 * Guia visual único (boas-vindas e novidades).
 * O Joyride cuida apenas do recorte iluminado (spotlight) e da camada escura;
 * o cartão é o do protótipo visual do projeto.
 */
const GuiaVisual: React.FC = () => {
  const { guia, indice, chave, temPendentes, avancar, voltar, pular, encerrar } = useGuiaVisual();
  const navigate = useNavigate();
  const location = useLocation();

  const cardRef = useRef<HTMLDivElement>(null);
  const botaoPrimarioRef = useRef<HTMLButtonElement>(null);
  const elementoAbertoRef = useRef<HTMLElement | null>(null);
  const [rectAlvo, setRectAlvo] = useState<DOMRect | null>(null);
  const [tamanhoCartao, setTamanhoCartao] = useState({ largura: 0, altura: 0 });

  const passo: PassoGuia | null = guia ? guia.passos[indice] ?? null : null;
  const totalPassos = guia ? guia.passos.length : 0;

  const alvoDisponivel = useCallback(
    (p: PassoGuia | null): boolean => {
      if (!p || !p.target) return false;
      if (p.requerPendentes && temPendentes !== true) return false;
      return typeof document !== 'undefined' && !!document.querySelector(p.target);
    },
    [temPendentes],
  );

  const usandoDemo = !alvoDisponivel(passo);

  // Navega para a rota do passo antes de exibi-lo
  useEffect(() => {
    if (!guia || !passo) return;
    if (!passo.rota) return;
    if (usandoDemo && passo.requerPendentes) return;
    const atual = `${location.pathname}${location.search}`;
    if (atual !== passo.rota) navigate(passo.rota);
  }, [guia, passo, usandoDemo, navigate, location.pathname, location.search]);

  // Mede o alvo destacado e o cartão
  const medir = useCallback(() => {
    if (!passo || !passo.target) {
      setRectAlvo(null);
      return;
    }
    const el = document.querySelector(passo.target);
    setRectAlvo(el ? el.getBoundingClientRect() : null);
  }, [passo]);

  useLayoutEffect(() => {
    medir();
    const cartao = cardRef.current;
    if (cartao) {
      setTamanhoCartao({ largura: cartao.offsetWidth, altura: cartao.offsetHeight });
    }
  }, [medir, indice, guia, usandoDemo]);

  useEffect(() => {
    if (!guia) return;
    const aoMover = () => medir();
    window.addEventListener('scroll', aoMover, true);
    window.addEventListener('resize', aoMover);
    return () => {
      window.removeEventListener('scroll', aoMover, true);
      window.removeEventListener('resize', aoMover);
    };
  }, [guia, medir]);

  // Foco no botão primário a cada passo
  useEffect(() => {
    if (!guia) return;
    const t = setTimeout(() => botaoPrimarioRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [guia, indice, usandoDemo]);

  // Fecha com Escape (sem marcar a visualização) e prende o Tab no cartão
  useEffect(() => {
    if (!guia) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        encerrar(false);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        avancar();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        voltar();
        return;
      }
      if (e.key === 'Tab') {
        const cartao = cardRef.current;
        if (!cartao) return;
        const botoes = Array.from(
          cartao.querySelectorAll<HTMLElement>('button:not([disabled])'),
        );
        if (botoes.length === 0) return;
        const primeiro = botoes[0];
        const ultimo = botoes[botoes.length - 1];
        // Foco fora do cartão (ex.: clique na página): traz de volta para o cartão
        if (!cartao.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? ultimo : primeiro).focus();
          return;
        }
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [guia, encerrar, avancar, voltar]);

  // Guarda o elemento que abriu o guia para restaurar o foco ao fechar
  useEffect(() => {
    if (guia) {
      elementoAbertoRef.current = document.activeElement as HTMLElement | null;
    } else {
      elementoAbertoRef.current?.focus?.();
      elementoAbertoRef.current = null;
    }
  }, [guia]);

  const posicao = useMemo<PosicaoCartao>(() => {
    const janelaW = typeof window !== 'undefined' ? window.innerWidth : 0;
    const janelaH = typeof window !== 'undefined' ? window.innerHeight : 0;
    const largura = tamanhoCartao.largura || Math.min(465, janelaW - 32);
    const altura = tamanhoCartao.altura || 200;

    // Celular: cartão fixo na parte inferior
    if (ehCelular()) {
      return { bottom: 10, left: 16, right: 16 };
    }

    if (!rectAlvo || rectAlvo.width === 0) {
      // Sem alvo: canto inferior direito (posição do protótipo)
      return { bottom: 18, right: 24 };
    }

    // Preferência: à direita do alvo
    const espacoDireita = janelaW - rectAlvo.right;
    if (espacoDireita >= largura + MARGEM_CARTAO) {
      const top = Math.min(
        Math.max(rectAlvo.top - 8, MARGEM_BOTAO),
        Math.max(janelaH - altura - MARGEM_BOTAO, MARGEM_BOTAO),
      );
      return { top, left: rectAlvo.right + MARGEM_CARTAO };
    }

    // Senão: abaixo do alvo
    const espacoAbaixo = janelaH - rectAlvo.bottom;
    if (espacoAbaixo >= altura + MARGEM_CARTAO) {
      const left = Math.min(
        Math.max(rectAlvo.left - 8, MARGEM_BOTAO),
        Math.max(janelaW - largura - MARGEM_BOTAO, MARGEM_BOTAO),
      );
      return { top: rectAlvo.bottom + MARGEM_CARTAO, left };
    }

    // Sem espaço: canto inferior direito
    return { bottom: 18, right: 24 };
  }, [rectAlvo, tamanhoCartao]);

  const steps = useMemo(() => {
    if (!passo) return [];
    return [
      {
        target: usandoDemo ? 'body' : passo.target!,
        placement: passo.placement ?? ('bottom' as const),
        title: passo.title,
        content: passo.content,
        disableCloseOnEsc: true,
      },
    ];
  }, [passo, usandoDemo]);

  if (!guia || !passo) return null;

  const ehUltimo = indice >= totalPassos - 1;
  const rotuloProgresso = passo.rotuloProgresso || guia.rotulo;

  return (
    <>
      <Joyride
        key={`${chave}-${indice}-${usandoDemo ? 'demo' : 'real'}`}
        steps={steps}
        run
        continuous={false}
        tooltipComponent={() => <span className="hidden" aria-hidden />}
        options={{
          showProgress: false,
          disableFocusTrap: true,
          dismissKeyAction: false,
          closeButtonAction: 'close',
          overlayClickAction: false,
          spotlightPadding: 6,
          spotlightRadius: 10,
          targetWaitTimeout: 2500,
          scrollOffset: 80,
          zIndex: 1000,
        }}
        styles={{
          overlay: { backgroundColor: COR_OVERLAY },
          spotlight: { stroke: COR_CONTORNO, strokeWidth: 3 },
        }}
      />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-visual-titulo"
        className="fixed z-[1001] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[min(465px,calc(100vw-32px))]"
        style={posicao}
      >
        <div className="flex items-start gap-2">
          <p
            className="text-[13px] font-bold text-[#325484] dark:text-blue-300 flex-1"
            aria-live="polite"
          >
            {rotuloProgresso} · {indice + 1} de {totalPassos}
          </p>
          <button
            type="button"
            onClick={() => encerrar(false)}
            aria-label="Fechar guia"
            title="Fechar (Esc)"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 leading-none -mt-0.5"
          >
            ✕
          </button>
        </div>

        <h2
          id="guia-visual-titulo"
          className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-1"
        >
          {passo.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-1">
          {passo.content}
        </p>

        {passo.demo && <div className="mt-3">{passo.demo}</div>}

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button
            type="button"
            onClick={pular}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Pular
          </button>
          {indice > 0 && (
            <button
              type="button"
              onClick={voltar}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            ref={botaoPrimarioRef}
            type="button"
            onClick={ehUltimo ? () => encerrar(true) : avancar}
            className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
          >
            {ehUltimo ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </>
  );
};

export default GuiaVisual;
