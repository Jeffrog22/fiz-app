import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { registrarOperacao } from '../utils/logEngine';

export async function salvarCardAula(
  tenantId: string,
  data: string,
  indice_aula: number,
  temperatura_externa?: number,
  temperatura_piscina?: number,
  cloro_ppm?: number,
  condicao_clima?: string,
  sensacao?: string[],
  status_sugerido?: string,
  motivo_sugerido?: string,
  // Toggle 'extrapolacao_restrita' ativo: card separado por professor (piscinas
  // diferentes). Ausente => professor_id NULL => comportamento antigo (compartilhado).
  professorId?: string,
): Promise<{ id: string; criado_em: string } | null> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const dataFields = {
    temperatura_externa: temperatura_externa ?? null,
    temperatura_piscina: temperatura_piscina ?? null,
    cloro_ppm: cloro_ppm ?? null,
    condicao_clima: condicao_clima ?? null,
    ...(sensacao !== undefined && { sensacao }),
    ...(status_sugerido !== undefined && { status_sugerido }),
    ...(motivo_sugerido !== undefined && { motivo_sugerido }),
  };

  // Verifica se ja existe registro para este indice (e professor, quando filtrado)
  let existenteQuery = supabase
    .from('card_aula')
    .select('id, criado_em')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula);
  if (professorId) existenteQuery = existenteQuery.eq('professor_id', professorId);
  const { data: existing } = await existenteQuery.maybeSingle();

  let result: { id: string; criado_em: string } | null = null;

  if (existing) {
    // Update: preserva criado_em original (evita que re-salvar quebre propagação de outros índices)
    let updateQuery = supabase
      .from('card_aula')
      .update(dataFields)
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', indice_aula);
    if (professorId) updateQuery = updateQuery.eq('professor_id', professorId);
    const { data: updated, error } = await updateQuery
      .select('id, criado_em')
      .maybeSingle();

    if (error) {
      console.error('[cardAulaService] Erro ao atualizar card_aula:', error.message);
    } else {
      result = updated ? { id: updated.id, criado_em: updated.criado_em } : null;
    }
  } else {
    // Insert: registra criado_em
    const { data: inserted, error } = await supabase
      .from('card_aula')
      .insert({
        tenant_id: tenantId,
        data,
        indice_aula,
        professor_id: professorId ?? null,
        criado_em: new Date().toISOString(),
        ...dataFields,
      })
      .select('id, criado_em')
      .maybeSingle();

    if (error) {
      // Se tabela card_aula nao existe, ignora
      if (!error.message?.includes('relation') && !error.message?.includes('does not exist')) {
        console.error('[cardAulaService] Erro ao inserir card_aula:', error.message);
      }
    } else {
      result = inserted ? { id: inserted.id, criado_em: inserted.criado_em } : null;
    }
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'card_aula',
    operacao: existing ? 'atualizacao' : 'insercao',
    dados: { data, indice_aula, professor_id: professorId ?? null, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima },
  });

  return result;
}

export async function obterCardAula(data: string, tenantId: string, professorId?: string): Promise<any[]> {
  let query = supabase
    .from('card_aula')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('data', data);
  if (professorId) query = query.eq('professor_id', professorId);
  const { data: registros, error } = await query.order('indice_aula', { ascending: true });

  if (error) {
    // Coluna professor_id pode nao existir ainda (migracao 032 pendente) — refaz sem filtro
    if (professorId && (error.message?.includes('professor_id') || error.message?.includes('column'))) {
      const retry = await supabase
        .from('card_aula')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('data', data)
        .order('indice_aula', { ascending: true });
      return finalizarLeitura(retry.data, retry.error, tenantId, data);
    }
    return finalizarLeitura(undefined, error, tenantId, data);
  }

  // Toggle ativo e professor sem card proprio no dia: nao cai no fallback compartilhado
  // (veria card de outro professor em piscina diferente)
  if (professorId) return registros || [];

  if (registros && registros.length > 0) return registros;

  // Fallback: tentar de chamadas_log
  return buscarCardAulaFallback(tenantId, data);
}

async function finalizarLeitura(
  registros: any[] | null | undefined,
  error: { message?: string } | null,
  tenantId: string,
  data: string,
): Promise<any[]> {
  if (error) {
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      return buscarCardAulaFallback(tenantId, data);
    }
    // Tenta fallback mesmo em outros erros
    try {
      return await buscarCardAulaFallback(tenantId, data);
    } catch {
      throw new AppError('Erro ao buscar CardAula', 500);
    }
  }

  if (registros && registros.length > 0) return registros;

  // Fallback: tentar de chamadas_log
  return buscarCardAulaFallback(tenantId, data);
}

async function buscarCardAulaFallback(tenantId: string, data: string): Promise<any[]> {
  const { data: logs } = await supabase
    .from('chamadas_log')
    .select('condicao_clima, temperatura_ext, temperatura_piscina, cloro_ppm, sensacao, status_sugerido, motivo_sugerido, indice_aula')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .not('condicao_clima', 'is', null)
    .order('indice_aula', { ascending: true });

  if (logs && logs.length > 0) {
    return logs.map((l: any) => ({
      condicao_clima: l.condicao_clima,
      temperatura_externa: l.temperatura_ext,
      temperatura_piscina: l.temperatura_piscina,
      cloro_ppm: l.cloro_ppm,
      sensacao: l.sensacao,
      status_sugerido: l.status_sugerido,
      motivo_sugerido: l.motivo_sugerido,
      indice_aula: l.indice_aula,
    }));
  }

  return [];
}
