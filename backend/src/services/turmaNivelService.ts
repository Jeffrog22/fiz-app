import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import type {
  StatusNivelPendencia,
  TransferenciaNivelPendencia,
} from '../types';

const VIGENCIA_TABLE = 'turma_nivel_vigencia';
const PENDENCIA_TABLE = 'transferencia_nivel_pendencia';
const DEPENDENCIA_TABLE = 'transferencia_nivel_pendencia_lote';

/** Status que ainda representam uma proposta a ser revisada/aplicada */
export const STATUS_PENDENCIA_ATIVOS: StatusNivelPendencia[] = ['pendente', 'conflito'];

/**
 * Detecta se a tabela de vigencia ainda nao existe (migration 038 pendente).
 * Nesses casos os fluxos degradam para o comportamento atual (turmas.nivel).
 */
function tabelaAusente(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error.code || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
  );
}

/**
 * Resolve o nivel vigente de cada turma em uma data de referencia.
 * Retorna mapa grupo_id -> nivel. Turmas sem registro usam o nivel atual.
 */
export async function nivelVigenteService(
  tenantId: string,
  turmas: Array<{ grupo_id?: string | null; nivel?: string | null }>,
  dataReferencia: string,
): Promise<Map<string, string | null>> {
  const resultado = new Map<string, string | null>();
  for (const t of turmas) {
    if (t.grupo_id) resultado.set(t.grupo_id, t.nivel ?? null);
  }
  if (!dataReferencia || turmas.length === 0) return resultado;

  const { data, error } = await supabase
    .from(VIGENCIA_TABLE)
    .select('turma_grupo_id, nivel, data_inicio, data_fim')
    .eq('tenant_id', tenantId)
    .lte('data_inicio', dataReferencia)
    .or(`data_fim.is.null,data_fim.gte.${dataReferencia}`);

  if (error) {
    if (!tabelaAusente(error)) {
      throw new AppError('Erro ao consultar vigencia de nivel da turma', 500);
    }
    return resultado; // fail-open: sem a migration 038 usa turmas.nivel
  }

  // Mantem o registro mais recente (maior data_inicio) por turma
  const porTurma = new Map<string, { nivel: string | null; data_inicio: string }>();
  for (const v of (data || []) as any[]) {
    const anterior = porTurma.get(v.turma_grupo_id);
    if (!anterior || String(v.data_inicio) > anterior.data_inicio) {
      porTurma.set(v.turma_grupo_id, { nivel: v.nivel ?? null, data_inicio: String(v.data_inicio) });
    }
  }

  for (const [grupoId, registro] of porTurma) {
    if (resultado.has(grupoId)) resultado.set(grupoId, registro.nivel);
  }

  return resultado;
}

/** Lista toda a vigencia de nivel da unidade (para resolver varias datas) */
export async function listarVigenciasService(
  tenantId: string,
): Promise<Array<{ turma_grupo_id: string; nivel: string | null; data_inicio: string; data_fim: string | null }>> {
  const { data, error } = await supabase
    .from(VIGENCIA_TABLE)
    .select('turma_grupo_id, nivel, data_inicio, data_fim')
    .eq('tenant_id', tenantId)
    .order('data_inicio', { ascending: true });

  if (error) {
    if (tabelaAusente(error)) return [];
    throw new AppError('Erro ao consultar vigencia de nivel da turma', 500);
  }

  return ((data || []) as any[]).map((v) => ({
    turma_grupo_id: v.turma_grupo_id,
    nivel: v.nivel ?? null,
    data_inicio: String(v.data_inicio),
    data_fim: v.data_fim ? String(v.data_fim) : null,
  }));
}

/**
 * Resolve o nivel de uma turma em uma data a partir da vigencia carregada.
 * Retorna undefined quando nao ha registro (usar o fallback do chamador).
 */
export function resolverNivelPorData(
  vigencias: Array<{ turma_grupo_id: string; nivel: string | null; data_inicio: string; data_fim: string | null }>,
  turmaGrupoId: string | null | undefined,
  data: string,
): string | null | undefined {
  if (!turmaGrupoId || !data) return undefined;
  let melhor: { nivel: string | null; data_inicio: string } | null = null;
  for (const v of vigencias) {
    if (v.turma_grupo_id !== turmaGrupoId) continue;
    if (v.data_inicio > data) continue;
    if (v.data_fim && v.data_fim < data) continue;
    if (!melhor || v.data_inicio > melhor.data_inicio) {
      melhor = { nivel: v.nivel, data_inicio: v.data_inicio };
    }
  }
  return melhor ? melhor.nivel : undefined;
}

/**
 * Registra a vigencia de nivel de uma turma: fecha o intervalo anterior em
 * (dataInicio - 1 dia) e abre um novo intervalo a partir de dataInicio.
 */
export async function registrarVigenciaNivelService(
  tenantId: string,
  turmaGrupoId: string,
  nivel: string | null,
  dataInicio: string,
  loteId?: string | null,
): Promise<void> {
  const { error: selectError } = await supabase
    .from(VIGENCIA_TABLE)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('turma_grupo_id', turmaGrupoId)
    .is('data_fim', null);

  if (selectError) {
    if (tabelaAusente(selectError)) return; // fail-open
    throw new AppError('Erro ao consultar vigencia de nivel da turma', 500);
  }

  const dataFimAnterior = shiftDia(dataInicio, -1);
  const { error: closeError } = await supabase
    .from(VIGENCIA_TABLE)
    .update({ data_fim: dataFimAnterior, atualizado_em: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('turma_grupo_id', turmaGrupoId)
    .is('data_fim', null);

  if (closeError) {
    if (tabelaAusente(closeError)) return;
    throw new AppError('Erro ao encerrar vigencia de nivel da turma', 500);
  }

  const { error: insertError } = await supabase.from(VIGENCIA_TABLE).insert({
    tenant_id: tenantId,
    turma_grupo_id: turmaGrupoId,
    nivel: nivel || null,
    data_inicio: dataInicio,
    data_fim: null,
    lote_id: loteId || null,
  });

  if (insertError) {
    if (tabelaAusente(insertError)) return;
    throw new AppError('Erro ao registrar vigencia de nivel da turma', 500);
  }
}

/** Lista as propostas de mudanca de nivel da unidade (com os lotes dependentes) */
export async function listarPendenciasNivelService(
  tenantId: string,
): Promise<TransferenciaNivelPendencia[]> {
  const { data, error } = await supabase
    .from(PENDENCIA_TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', STATUS_PENDENCIA_ATIVOS)
    .order('data_efetiva', { ascending: true });

  if (error) {
    if (tabelaAusente(error)) return [];
    throw new AppError('Erro ao listar propostas de mudanca de nivel', 500);
  }

  const pendencias = (data || []) as any[];
  if (pendencias.length === 0) return [];

  const { data: dependencias } = await supabase
    .from(DEPENDENCIA_TABLE)
    .select('pendencia_id, lote_id')
    .eq('tenant_id', tenantId);

  const loteIds = [...new Set((dependencias || []).map((d: any) => d.lote_id))];
  let lotesPorId = new Map<string, any>();
  if (loteIds.length > 0) {
    const { data: lotes } = await supabase
      .from('transferencia_lote')
      .select('id, data_efetiva, turma_destino, status')
      .in('id', loteIds)
      .eq('tenant_id', tenantId);
    lotesPorId = new Map((lotes || []).map((l: any) => [l.id, l]));
  }

  return pendencias.map((p: any) => {
    const lotes = (dependencias || [])
      .filter((d: any) => d.pendencia_id === p.id)
      .map((d: any) => lotesPorId.get(d.lote_id))
      .filter(Boolean)
      .map((l: any) => ({
        id: l.id,
        data_efetiva: l.data_efetiva,
        turma_destino: l.turma_destino,
      }));
    return {
      id: p.id,
      tenant_id: p.tenant_id,
      turma_grupo_id: p.turma_grupo_id,
      nivel_atual: p.nivel_atual ?? null,
      nivel_novo: p.nivel_novo,
      data_efetiva: p.data_efetiva,
      status: p.status as StatusNivelPendencia,
      lote_origem_id: p.lote_origem_id ?? null,
      criado_em: p.criado_em,
      atualizado_em: p.atualizado_em,
      lotes,
    };
  });
}

export interface ResultadoPropostaNivel {
  pendenciaId: string | null;
  conflito: boolean;
  /** Propostas ja existentes para a mesma turma/data (para aviso de conflito) */
  conflitantes: Array<{ id: string; nivel_novo: string; status: StatusNivelPendencia }>;
}

/**
 * Cria ou reusa a proposta de mudanca de nivel para (turma, data, nivel).
 * - Mesma turma + data + mesmo nivel => reusa a proposta existente.
 * - Mesma turma + data + nivel diferente => cria a proposta como 'conflito'.
 */
export async function criarOuReusarPropostaNivelService(
  tenantId: string,
  turmaGrupoId: string,
  nivelAtual: string | null,
  nivelNovo: string,
  dataEfetiva: string,
  loteId: string,
): Promise<ResultadoPropostaNivel> {
  const nivelLimpo = String(nivelNovo || '').trim();
  if (!nivelLimpo) {
    throw new AppError('Informe o novo nivel da turma', 400);
  }

  const { data: existentes, error } = await supabase
    .from(PENDENCIA_TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('turma_grupo_id', turmaGrupoId)
    .eq('data_efetiva', dataEfetiva)
    .in('status', STATUS_PENDENCIA_ATIVOS);

  if (error) {
    if (tabelaAusente(error)) {
      return { pendenciaId: null, conflito: false, conflitantes: [] };
    }
    throw new AppError('Erro ao verificar propostas de mudanca de nivel', 500);
  }

  const lista = (existentes || []) as any[];
  const mesma = lista.find((p) => String(p.nivel_novo).trim() === nivelLimpo);
  const conflitantes = lista
    .filter((p) => String(p.nivel_novo).trim() !== nivelLimpo)
    .map((p) => ({
      id: p.id,
      nivel_novo: p.nivel_novo,
      status: p.status as StatusNivelPendencia,
    }));

  let pendencia = mesma || null;

  if (!pendencia) {
    const status: StatusNivelPendencia = conflitantes.length > 0 ? 'conflito' : 'pendente';
    const { data: criada, error: insertError } = await supabase
      .from(PENDENCIA_TABLE)
      .insert({
        tenant_id: tenantId,
        turma_grupo_id: turmaGrupoId,
        nivel_atual: nivelAtual || null,
        nivel_novo: nivelLimpo,
        data_efetiva: dataEfetiva,
        status,
        lote_origem_id: loteId,
      })
      .select()
      .single();

    if (insertError) {
      if (tabelaAusente(insertError)) {
        return { pendenciaId: null, conflito: false, conflitantes: [] };
      }
      throw new AppError('Erro ao criar proposta de mudanca de nivel', 500);
    }
    pendencia = criada;
  }

  // Vincula o lote a proposta (idempotente)
  await supabase.from(DEPENDENCIA_TABLE).upsert(
    {
      pendencia_id: pendencia.id,
      lote_id: loteId,
      tenant_id: tenantId,
    },
    { onConflict: 'pendencia_id,lote_id', ignoreDuplicates: true },
  );

  return {
    pendenciaId: pendencia.id,
    conflito: pendencia.status === 'conflito',
    conflitantes,
  };
}

/**
 * Libera a dependencia de um lote sobre a proposta de mudanca de nivel.
 * Se nao restar nenhum lote dependente, a proposta e cancelada.
 */
export async function liberarPropostaDoLoteService(
  tenantId: string,
  loteId: string,
): Promise<void> {
  const { data: dependencias, error } = await supabase
    .from(DEPENDENCIA_TABLE)
    .select('id, pendencia_id')
    .eq('tenant_id', tenantId)
    .eq('lote_id', loteId);

  if (error) {
    if (tabelaAusente(error)) return;
    throw new AppError('Erro ao consultar dependencia de mudanca de nivel', 500);
  }

  if (!dependencias || dependencias.length === 0) return;

  const pendenciaIds = [...new Set((dependencias as any[]).map((d: any) => d.pendencia_id))];

  const { error: deleteError } = await supabase
    .from(DEPENDENCIA_TABLE)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('lote_id', loteId);

  if (deleteError && !tabelaAusente(deleteError)) {
    throw new AppError('Erro ao liberar dependencia de mudanca de nivel', 500);
  }

  for (const pendenciaId of pendenciaIds) {
    const { data: restantes } = await supabase
      .from(DEPENDENCIA_TABLE)
      .select('id')
      .eq('pendencia_id', pendenciaId);

    if ((restantes || []).length === 0) {
      await supabase
        .from(PENDENCIA_TABLE)
        .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
        .eq('id', pendenciaId)
        .eq('tenant_id', tenantId)
        .in('status', STATUS_PENDENCIA_ATIVOS);
    }
  }
}

/** Desloca uma data ISO em N dias (YYYY-MM-DD) */
export function shiftDia(dataIso: string, dias: number): string {
  const [ano, mes, dia] = String(dataIso).slice(0, 10).split('-').map((n) => parseInt(n, 10));
  if (!ano || !mes || !dia) return dataIso;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + dias);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}
