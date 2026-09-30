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
