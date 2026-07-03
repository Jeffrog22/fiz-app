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
    .upsert(cardAulaFields, { onConflict: 'tenant_id,data' });

  if (cardError) {
    // Se tabela card_aula nao existe, ignora (apenas propaga p/ chamadas_log)
    if (!cardError.message?.includes('relation') && !cardError.message?.includes('does not exist')) {
      console.error('[cardAulaService] Erro ao salvar card_aula:', cardError.message);
    }
  }

  // 2. Propagar para chamadas_log (apenas alunos do indice_aula)
  const logFields: Record<string, any> = {
    condicao_clima: condicao_clima ?? null,
    temperatura_ext: temperatura_externa ?? null,
    temperatura_piscina: temperatura_piscina ?? null,
    cloro_ppm: cloro_ppm ?? null,
  };
  if (sensacao !== undefined) logFields.sensacao = sensacao;
  if (status_sugerido !== undefined) logFields.status_sugerido = status_sugerido;
  if (motivo_sugerido !== undefined) logFields.motivo_sugerido = motivo_sugerido;

  const { error: updateError } = await supabase
    .from('chamadas_log')
    .update(logFields)
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula);

  if (updateError) {
    console.error('[cardAulaService] Erro ao propagar p/ chamadas_log:', updateError.message);
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'card_aula',
    operacao: 'atualizacao',
    dados: { data, indice_aula, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima },
  });
}

export async function obterCardAula(data: string, tenantId: string): Promise<any> {
  const { data: registro, error } = await supabase
    .from('card_aula')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .maybeSingle();

  if (error) {
    // Se tabela nao existe, retorna null
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      return null;
    }
    throw new AppError('Erro ao buscar CardAula', 500);
  }

  return registro || null;
}
