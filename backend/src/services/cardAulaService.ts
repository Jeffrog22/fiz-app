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

  // Verifica se ja existe registro para este indice
  const { data: existing } = await supabase
    .from('card_aula')
    .select('id, criado_em')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula)
    .maybeSingle();

  let result: { id: string; criado_em: string } | null = null;

  if (existing) {
    // Update: preserva criado_em original (evita que re-salvar quebre propagação de outros índices)
    const { data: updated, error } = await supabase
      .from('card_aula')
      .update(dataFields)
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', indice_aula)
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
    dados: { data, indice_aula, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima },
  });

  return result;
}

export async function obterCardAula(data: string, tenantId: string): Promise<any[]> {
  const { data: registros, error } = await supabase
    .from('card_aula')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .order('indice_aula', { ascending: true });

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
