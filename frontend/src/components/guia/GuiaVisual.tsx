import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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

const GuiaVisual: React.FC = () => {
  const { guia, indice, temPendentes, avancar, voltar, pular, encerrar } = useGuiaVisual();
  const navigate = useNavigate();
  const location = useLocation();

  const cardRef = useRef<HTMLDivElement>(null);
  const botaoPrimarioRef = useRef<HTMLButtonElement>(null);
  const elementoAbertoRef = useRef<HTMLElement | null>(null);
  const [rectAlvo, setRectAlvo] = useState<DOMRect | null>(null);
  const [tamanhoCartao, setTamanhoCartao] = useState({ largura: 0, altura: 0 });

  const passo: PassoGuia | null = guia ? guia.passos[indice] ?? null : null;
  const totalPassos = guia ? guia.passos.length : 0;

  const rotaPronta = !passo?.rota || passo.rota === `${location.pathname}${location.search}`;
  const podeDestacar = rotaPronta && (!passo?.requerPendentes || temPendentes === true);

  const passoRef = useRef<PassoGuia | null>(passo);
  passoRef.current = passo;
  const podeDestacarRef = useRef<boolean>(podeDestacar);
  podeDestacarRef.current = podeDestacar;
  const tentativasRef = useRef(0);

  useEffect(() => {
    if (passo?.rota && !rotaPronta && (!passo.requerPendentes || temPendentes === true)) {
      navigate(passo.rota);
    }
  }, [passo, rotaPronta, temPendentes, navigate]);

  useLayoutEffect(() => {
    if (!passo) return;
    let alvoAnterior: Element | null = null;
    const MAX_TENTATIVAS = 5;
    const medir = () => {
      const alvo = podeDestacarRef.current && passoRef.current?.target
        ? document.querySelector(passoRef.current.target)
        : null;
      if (alvo && alvo !== alvoAnterior && alvo.getClientRects().length) {
        alvo.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        tentativasRef.current = 0;
      } else if ((!alvo || alvo.getClientRects().length === 0) && tentativasRef.current < MAX_TENTATIVAS) {
        // Alvo ainda não está no DOM (ex.: rota ainda navegando). Tenta de novo.
        tentativasRef.current += 1;
        requestAnimationFrame(medir);
      }
      alvoAnterior = alvo;
      const rect = alvo?.getBoundingClientRect();
      const visivel = rect && rect.width && rect.height && rect.bottom > 0 &&
        rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      const proximo = visivel ? rect : null;
      setRectAlvo((anterior) => anterior?.x === proximo?.x && anterior?.y === proximo?.y &&
        anterior?.width === proximo?.width && anterior?.height === proximo?.height ? anterior : proximo);
    };
    medir();
    const observer = new MutationObserver(medir);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [passo, podeDestacar, location]);

  useLayoutEffect(() => {
    const cartao = cardRef.current;
    if (!cartao) return;
    const observer = new ResizeObserver(() => {
      setTamanhoCartao({ largura: cartao.offsetWidth, altura: cartao.offsetHeight });
    });
    observer.observe(cartao);
    return () => observer.disconnect();
  }, [guia]);

  // Foco no botão primário a cada passo
  useEffect(() => {
    if (!guia) return;
    const t = setTimeout(() => botaoPrimarioRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [guia, indice]);

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
        if (indice < totalPassos - 1) avancar();
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
  }, [guia, encerrar, avancar, voltar, indice, totalPassos]);

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

  if (!guia || !passo) return null;

  const ehUltimo = indice >= totalPassos - 1;
  const rotuloProgresso = passo.rotuloProgresso || guia.rotulo;
  const recorte = rectAlvo && {
    left: Math.max(0, rectAlvo.left - 6),
    top: Math.max(0, rectAlvo.top - 6),
    right: Math.min(window.innerWidth, rectAlvo.right + 6),
    bottom: Math.min(window.innerHeight, rectAlvo.bottom + 6),
  };
  const clipPath = recorte ? `polygon(evenodd,
    0 0, 100% 0, 100% 100%, 0 100%, 0 0,
    ${recorte.left}px ${recorte.top}px, ${recorte.left}px ${recorte.bottom}px,
    ${recorte.right}px ${recorte.bottom}px, ${recorte.right}px ${recorte.top}px,
    ${recorte.left}px ${recorte.top}px)` : undefined;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[1000]" aria-hidden="true">
        <div className="absolute inset-0" style={{ backgroundColor: COR_OVERLAY, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', clipPath }} />
        {recorte && (
          <div className="absolute rounded-[10px] border-[3px]" style={{
            left: recorte.left, top: recorte.top,
            width: recorte.right - recorte.left, height: recorte.bottom - recorte.top,
            borderColor: COR_CONTORNO,
          }} />
        )}
      </div>

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

        {!rectAlvo && passo.demo && <div className="mt-3">{passo.demo}</div>}

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
    </>,
    document.body,
  );
};

export default GuiaVisual;
