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
): Promise<void> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  // 1. Upsert no card_aula (documento diario da piscina)
  const cardAulaFields: Record<string, any> = {
    tenant_id: tenantId,
    data,
    indice_aula,
    temperatura_externa: temperatura_externa ?? null,
    temperatura_piscina: temperatura_piscina ?? null,
    cloro_ppm: cloro_ppm ?? null,
    condicao_clima: condicao_clima ?? null,
  };
  if (sensacao !== undefined) cardAulaFields.sensacao = sensacao;
  if (status_sugerido !== undefined) cardAulaFields.status_sugerido = status_sugerido;
  if (motivo_sugerido !== undefined) cardAulaFields.motivo_sugerido = motivo_sugerido;

  const { error: cardError } = await supabase
    .from('card_aula')
    .upsert(cardAulaFields, { onConflict: 'tenant_id,data,indice_aula' });

  if (cardError) {
    // Se tabela card_aula nao existe, ignora (apenas propaga p/ chamadas_log)
    if (!cardError.message?.includes('relation') && !cardError.message?.includes('does not exist')) {
      console.error('[cardAulaService] Erro ao salvar card_aula:', cardError.message);
    }
  }

  // 2. CardAula é diário da piscina — NÃO propaga para chamadas_log (evita 125 logs/dia)
  // A extrapolação (cancela/justifica) cria 1 log por turma no chamadas_log

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'card_aula',
    operacao: 'atualizacao',
    dados: { data, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima },
  });
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
