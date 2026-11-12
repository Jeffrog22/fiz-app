import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { GUIAS, type GuiaVisual } from '../data/guiaVisual';
import {
  guiaDeTipo,
  guiaPorId,
  versaoAtualApp,
} from '../utils/guiaVisualUtils';
import {
  marcarSequenciaVista,
  marcarTourVisto,
  sequenciaJaVista,
  setUltimaVersaoVista,
  tourJaVisto,
} from '../utils/tutorialStorage';

export interface GuiaVisualState {
  /** Guia em execução (null = nenhum guia aberto). */
  guia: GuiaVisual | null;
  /** Índice do passo atual. */
  indice: number;
  /** Chave de remontagem do componente de apresentação. */
  chave: number;
  /** A unidade tem transferências pendentes? (null = ainda não consultado) */
  temPendentes: boolean | null;
  /** Guia de novidades elegível para a versão instalada. */
  guiaNovidades: GuiaVisual | null;
  /** A sequência de novidades já foi vista por este professor? */
  novidadesVistas: boolean;
  /** Abre um guia pelo id. */
  iniciar: (id: string) => void;
  /** Encerra o guia; `marcar` = concluir ou pular (registra a visualização). */
  encerrar: (marcar: boolean) => void;
  /** Avança um passo (encerra no último). */
  avancar: () => void;
  /** Volta um passo. */
  voltar: () => void;
  /** Pula o guia (encerra marcando a visualização). */
  pular: () => void;
}

export const GuiaVisualContext = createContext<GuiaVisualState | null>(null);

export const GuiaVisualProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { professorId } = useAuth();
  const navigate = useNavigate();
  const [guia, setGuia] = useState<GuiaVisual | null>(null);
  const [indice, setIndice] = useState(0);
  const [chave, setChave] = useState(0);
  const [temPendentes, setTemPendentes] = useState<boolean | null>(null);
  const [novidadesVistas, setNovidadesVistas] = useState(false);

  const professorRef = useRef(professorId);
  professorRef.current = professorId;
  const guiaRef = useRef<GuiaVisual | null>(null);
  guiaRef.current = guia;
  const iniciadoRef = useRef(false);

  const versaoAtual = versaoAtualApp();
  const guiaNovidades = useMemo(
    () => guiaDeTipo(GUIAS, 'novidades', versaoAtual),
    [versaoAtual],
  );

  // Estado inicial das flags (depende do professor/unidade)
  useEffect(() => {
    if (!professorId) return;
    setNovidadesVistas(
      guiaNovidades ? sequenciaJaVista(guiaNovidades.id, professorId) : true,
    );
  }, [professorId, guiaNovidades]);

  const iniciar = useCallback(
    (id: string) => {
      const alvo = guiaPorId(GUIAS, id);
      if (!alvo) return;
      setGuia(alvo);
      setIndice(0);
      setChave((c) => c + 1);
      setTemPendentes(null);
      // Consulta se a unidade tem transferências pendentes (somente leitura)
      api
        .get('/transferencias-nivel/lotes/pendentes/count')
        .then((res) => setTemPendentes((res.data?.pendentes || 0) > 0))
        .catch(() => setTemPendentes(false));
    },
    [],
  );

  /** Registra a visualização da sequência (usada ao concluir ou pular). */
  const registrarVisualizacao = useCallback((alvo: GuiaVisual | null) => {
    if (!alvo) return;
    const pid = professorRef.current;
    if (!pid) return;
    if (alvo.tipo === 'boas-vindas') {
      marcarTourVisto(pid);
    } else {
      marcarSequenciaVista(alvo.id, pid);
    }
    const versao = versaoAtualApp();
    if (versao) setUltimaVersaoVista(pid, versao);
    if (alvo.tipo === 'novidades') setNovidadesVistas(true);
  }, []);

  const encerrar = useCallback(
    (marcar: boolean) => {
      if (marcar) registrarVisualizacao(guiaRef.current);
      setGuia(null);
      setIndice(0);
      setTemPendentes(null);
    },
    [registrarVisualizacao],
  );

  const avancar = useCallback(() => {
    const atual = guiaRef.current;
    if (!atual) return;
    if (indice >= atual.passos.length - 1) {
      // último passo: concluir (marca a visualização)
      registrarVisualizacao(atual);
      setGuia(null);
      setIndice(0);
      setTemPendentes(null);
      return;
    }
    setIndice((i) => i + 1);
  }, [indice, registrarVisualizacao]);

  const voltar = useCallback(() => {
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  const pular = useCallback(() => {
    registrarVisualizacao(guiaRef.current);
    setGuia(null);
    setIndice(0);
    setTemPendentes(null);
  }, [registrarVisualizacao]);

  // Boas-vindas automáticas apenas para quem ainda não fez o tutorial
  useEffect(() => {
    if (!professorId || iniciadoRef.current) return;
    iniciadoRef.current = true;
    const timer = setTimeout(() => {
      const pid = professorRef.current;
      if (!pid) return;
      if (tourJaVisto(pid)) return;
      const atual = versaoAtualApp();
      if (atual) setUltimaVersaoVista(pid, atual);
      iniciar('boas-vindas');
    }, 900);
    return () => clearTimeout(timer);
  }, [professorId, iniciar]);

  // Abertura manual (Home, Central de Ajuda, Configurações)
  useEffect(() => {
    const handler = (e: Event) => {
      const detalhe = (e as CustomEvent<{ id?: string }>).detail;
      const id = detalhe?.id;
      if (id) iniciar(id);
    };
    window.addEventListener('guia:abrir', handler);
    return () => window.removeEventListener('guia:abrir', handler);
  }, [iniciar]);

  const valor: GuiaVisualState = {
    guia,
    indice,
    chave,
    temPendentes,
    guiaNovidades,
    novidadesVistas,
    iniciar,
    encerrar,
    avancar,
    voltar,
    pular,
  };

  return <GuiaVisualContext.Provider value={valor}>{children}</GuiaVisualContext.Provider>;
};

export default GuiaVisualProvider;
