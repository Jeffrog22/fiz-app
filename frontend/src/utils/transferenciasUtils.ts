import type {
  Aluno,
  StatusTransferenciaLote,
  TransferenciaLote,
  TransferenciaLoteItem,
  Turma,
} from '../types';

export const STATUS_LOTE_ATIVOS: StatusTransferenciaLote[] = ['programado', 'revisao'];

export function isLoteAtivo(status?: string | null): boolean {
  return !!status && (STATUS_LOTE_ATIVOS as string[]).includes(status);
}

/** Data de hoje no fuso America/Sao_Paulo (YYYY-MM-DD) */
export function hojeSaoPaulo(referencia: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referencia);
}

/** Primeiro dia do mês seguinte à data de referência (America/Sao_Paulo) */
export function primeiroDiaMesSeguinte(referencia?: string): string {
  const base = referencia ? referencia.slice(0, 10) : hojeSaoPaulo();
  const [ano, mes] = base.split('-').map((n) => parseInt(n, 10));
  if (!ano || !mes) return base;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  return `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`;
}

/** Competência (mês/ano) de uma data ISO */
export function mesAnoDeData(dataIso?: string | null): { mes: number; ano: number } | null {
  if (!dataIso) return null;
  const [ano, mes] = dataIso.slice(0, 10).split('-').map((n) => parseInt(n, 10));
  if (!ano || !mes) return null;
  return { mes, ano };
}

export interface MovimentoTransferencia {
  aluno_id: string;
  turma_origem: string;
  turma_destino: string;
  lote_id: string;
  data_efetiva: string;
}

/** Movements (entrada/saída) gerados pelos lotes pendentes */
export function coletarMovimentos(
  lotes: TransferenciaLote[],
  itensPorLote: Record<string, TransferenciaLoteItem[]>,
): MovimentoTransferencia[] {
  const movimentos: MovimentoTransferencia[] = [];
  for (const lote of lotes) {
    if (!isLoteAtivo(lote.status)) continue;
    const itens = itensPorLote[lote.id] || [];
    for (const item of itens) {
      if (item.status !== 'pendente') continue;
      movimentos.push({
        aluno_id: item.aluno_id,
        turma_origem: item.turma_origem,
        turma_destino: item.turma_destino,
        lote_id: lote.id,
        data_efetiva: lote.data_efetiva,
      });
    }
  }
  return movimentos;
}

export interface ComposicaoTurma {
  alunos: Aluno[];
  entradas: Aluno[];
  saidas: Aluno[];
}

/**
 * Composição projetada de uma turma:
 * alunos atuais − saídas pendentes + entradas pendentes
 */
export function comporTurma(
  grupoId: string,
  alunosAtivos: Aluno[],
  movimentos: MovimentoTransferencia[],
): ComposicaoTurma {
  const atuais = alunosAtivos.filter((a) => a.turma_id === grupoId);
  const saidasIds = new Set(
    movimentos.filter((m) => m.turma_origem === grupoId).map((m) => m.aluno_id),
  );
  const entradasIds = new Set(
    movimentos.filter((m) => m.turma_destino === grupoId).map((m) => m.aluno_id),
  );

  const restantes = atuais.filter((a) => !saidasIds.has(a.id));
  const entradas = [...entradasIds]
    .filter((id) => !restantes.some((a) => a.id === id))
    .map((id) => alunosAtivos.find((a) => a.id === id))
    .filter((a): a is Aluno => !!a);

  return {
    alunos: [...restantes, ...entradas],
    entradas,
    saidas: atuais.filter((a) => saidasIds.has(a.id)),
  };
}

export type PapelTurma = 'origem' | 'destino' | 'ambos';

export interface LinhaVisaoGeral {
  grupo_id: string;
  professor_id?: string | null;
  professor_nome: string;
  label: string;
  horario: string;
  nivel?: string | null;
  capacidade?: number | null;
  lotacao_atual: number;
  lotacao_projetada: number;
  entradas: number;
  saidas: number;
  permanentes: number;
  papel: PapelTurma;
}

/**
 * Visão geral das turmas afetadas pelos lotes pendentes.
 * Projeção desconta saídas e soma entradas de todos os lotes pertinentes.
 */
export function calcularVisaoGeral(params: {
  lotes: TransferenciaLote[];
  itensPorLote: Record<string, TransferenciaLoteItem[]>;
  alunosAtivos: Aluno[];
  turmas: Turma[];
  professorMap?: Map<string, string>;
}): LinhaVisaoGeral[] {
  const { lotes, itensPorLote, alunosAtivos, turmas, professorMap } = params;
  const movimentos = coletarMovimentos(lotes, itensPorLote);

  const papelPorTurma = new Map<string, PapelTurma>();
  const marcar = (grupoId: string, papel: PapelTurma) => {
    if (!grupoId) return;
    const atual = papelPorTurma.get(grupoId);
    if (!atual) papelPorTurma.set(grupoId, papel);
    else if (atual !== papel) papelPorTurma.set(grupoId, 'ambos');
  };

  for (const m of movimentos) {
    marcar(m.turma_origem, 'origem');
    marcar(m.turma_destino, 'destino');
  }

  const linhas: LinhaVisaoGeral[] = [];
  for (const [grupoId, papel] of papelPorTurma.entries()) {
    const turma = turmas.find((t) => t.grupo_id === grupoId);
    const composicao = comporTurma(grupoId, alunosAtivos, movimentos);
    const lotacaoAtual = alunosAtivos.filter((a) => a.turma_id === grupoId).length;
    linhas.push({
      grupo_id: grupoId,
      professor_id: turma?.professor_id || null,
      professor_nome:
        (turma?.professor_id && professorMap?.get(turma.professor_id)) || turma?.professor_id || '—',
      label: turma?.label || '—',
      horario: (turma?.horario || '').slice(0, 5),
      nivel: turma?.nivel || null,
      capacidade: turma?.capacidade ?? null,
      lotacao_atual: lotacaoAtual,
      lotacao_projetada: composicao.alunos.length,
      entradas: composicao.entradas.length,
      saidas: composicao.saidas.length,
      permanentes: composicao.alunos.length - composicao.entradas.length,
      papel,
    });
  }

  return linhas.sort((a, b) => {
    const porProfessor = a.professor_nome.localeCompare(b.professor_nome, 'pt-BR');
    if (porProfessor !== 0) return porProfessor;
    return a.horario.localeCompare(b.horario, 'pt-BR');
  });
}

export interface ProjecaoLotacaoDestino {
  lotacao_atual: number;
  capacidade: number | null;
  saidas: number;
  entradas: number;
  projetado: number;
  vagas_restantes: number | null;
}

/** Projeção de lotação da turma destino para um bloco novo de transferências */
export function projetarLotacaoDestino(params: {
  turmaDestino?: Turma | null;
  alunosAtivos: Aluno[];
  alunoIdsSelecionados: string[];
  movimentosPendentes?: MovimentoTransferencia[];
}): ProjecaoLotacaoDestino {
  const { turmaDestino, alunosAtivos, alunoIdsSelecionados, movimentosPendentes = [] } = params;
  const grupoId = turmaDestino?.grupo_id || '';
  const lotacaoAtual = grupoId ? alunosAtivos.filter((a) => a.turma_id === grupoId).length : 0;

  const selecionados = new Set(alunoIdsSelecionados);
  const jaEstaNoDestino = alunosAtivos.filter(
    (a) => selecionados.has(a.id) && a.turma_id === grupoId,
  ).length;
  const entraNoDestino = alunosAtivos.filter(
    (a) => selecionados.has(a.id) && a.turma_id !== grupoId,
  ).length;

  // Saídas/entradas de outros lotes pendentes que também tocam esta turma
  const outrasSaidas = movimentosPendentes.filter(
    (m) => m.turma_origem === grupoId && !selecionados.has(m.aluno_id),
  ).length;
  const outrasEntradas = movimentosPendentes.filter(
    (m) => m.turma_destino === grupoId && !selecionados.has(m.aluno_id),
  ).length;

  const saidas = jaEstaNoDestino + outrasSaidas;
  const entradas = entraNoDestino + outrasEntradas;
  const projetado = lotacaoAtual - saidas + entradas;
  const capacidade = turmaDestino?.capacidade ?? null;

  return {
    lotacao_atual: lotacaoAtual,
    capacidade,
    saidas,
    entradas,
    projetado,
    vagas_restantes: capacidade === null ? null : capacidade - projetado,
  };
}
