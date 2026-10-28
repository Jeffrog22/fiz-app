import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

const TABLE = 'app_settings';

export async function getAppSetting(key: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao buscar configuração: ${error.message}`, 500);

  return data?.value ?? null;
}

export async function saveAppSetting(key: string, value: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ key, value, atualizado_em: new Date().toISOString() }, { onConflict: 'key' })
    .select('value')
    .single();

  if (error) throw new AppError(`Erro ao salvar configuração: ${error.message}`, 500);

  return data?.value ?? value;
}

// Chave: objeto por unidade (ex.: { "parque": true }) — app_settings e global,
// mas o valor isola o toggle por tenant (sem migration de tabela).
// Fail-open: erro/ausencia => false => comportamento atual (extrapolacao ampla).
export async function isExtrapolacaoRestrita(tenantId: string): Promise<boolean> {
  try {
    const value = await getAppSetting('extrapolacao_restrita');
    if (!value || typeof value !== 'object') return false;
    return value[tenantId] === true;
  } catch (e) {
    console.error('[isExtrapolacaoRestrita] Erro ao ler toggle, mantendo comportamento atual:', e);
    return false;
  }
}
