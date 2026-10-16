import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Step } from 'react-joyride';
import { useAuth } from './useAuth';
import { compararVersoes } from '../utils/version';
import {
  getUltimaVersaoVista,
  marcarTourVisto,
  setUltimaVersaoVista,
  tourJaVisto,
} from '../utils/tutorialStorage';
import { NOVIDADES_POR_VERSAO, TOUR_BOAS_VINDAS, type PassoTour } from '../data/tourSteps';

type TipoTour = 'boas-vindas' | 'novidades';

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

function versaoAtual(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
}

function prepararPassos(passos: PassoTour[], mobile: boolean): Step[] {
  return passos.map((p) => ({
    target: mobile || p.centralizado ? 'body' : (p.target ?? 'body'),
    placement: mobile || p.centralizado ? 'center' : (p.placement ?? 'bottom'),
    title: p.title,
    content: p.content,
    data: { rota: p.route },
  }));
}

/** Passos de novidades das versões entre `ultima` (exclusivo) e `atual` (inclusivo). */
export function passosNovidades(ultima: string, atual: string): PassoTour[] {
  return Object.keys(NOVIDADES_POR_VERSAO)
    .filter((v) => compararVersoes(v, ultima) > 0 && compararVersoes(v, atual) <= 0)
    .sort((a, b) => compararVersoes(a, b))
    .flatMap((v) => NOVIDADES_POR_VERSAO[v]);
}

export function useTutorial() {
  const { professorId } = useAuth();
  const navigate = useNavigate();
  const [passos, setPassos] = useState<Step[] | null>(null);
  const [tipo, setTipo] = useState<TipoTour | null>(null);
  const [chaveTour, setChaveTour] = useState(0);

  const professorRef = useRef(professorId);
  professorRef.current = professorId;
  const locationRef = useRef(window.location.pathname);
  locationRef.current = window.location.pathname;
  const iniciadoRef = useRef(false);

  const iniciar = useCallback((novoTipo: TipoTour, lista: PassoTour[]) => {
    if (lista.length === 0) return;
    setTipo(novoTipo);
    setPassos(prepararPassos(lista, isMobile()));
    setChaveTour((c) => c + 1);
  }, []);

  const finalizar = useCallback(() => {
    const pid = professorRef.current;
    if (pid) {
      marcarTourVisto(pid);
      const atual = versaoAtual();
      if (atual) setUltimaVersaoVista(pid, atual);
    }
    setPassos(null);
    setTipo(null);
  }, []);

  // Auto-start: tour de boas-vindas na primeira vez; senão, mini-tour de novidades.
  useEffect(() => {
    if (!professorId || iniciadoRef.current) return;
    iniciadoRef.current = true;
    const timer = setTimeout(() => {
      const pid = professorRef.current;
      if (!pid) return;
      const atual = versaoAtual();
      if (!tourJaVisto(pid)) {
        iniciar('boas-vindas', TOUR_BOAS_VINDAS);
        if (atual) setUltimaVersaoVista(pid, atual);
        return;
      }
      if (!atual) return;
      const ultima = getUltimaVersaoVista(pid);
      if (!ultima) {
        setUltimaVersaoVista(pid, atual);
        return;
      }
      if (compararVersoes(ultima, atual) >= 0) return;
      const novidades = passosNovidades(ultima, atual);
      if (novidades.length > 0) iniciar('novidades', novidades);
      else setUltimaVersaoVista(pid, atual);
    }, 900);
    return () => clearTimeout(timer);
  }, [professorId, iniciar]);

  // Reativação manual (Configurações › Ajuda & Tutorial).
  useEffect(() => {
    const handler = () => iniciar('boas-vindas', TOUR_BOAS_VINDAS);
    window.addEventListener('tutorial:iniciar', handler);
    return () => window.removeEventListener('tutorial:iniciar', handler);
  }, [iniciar]);

  /** Navega para a rota do passo antes de exibi-lo (chamado no onEvent do Joyride). */
  const navegarParaPasso = useCallback(
    (rota: string | undefined) => {
      if (rota && locationRef.current !== rota) {
        navigate(rota);
      }
    },
    [navigate]
  );

  return { passos, tipo, chaveTour, finalizar, navegarParaPasso };
}
