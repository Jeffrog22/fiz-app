import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { getVapidPublicKey } from '../utils/vapidKeys';

export function getPublicKey(): string {
  return getVapidPublicKey();
}

export async function subscribe(
  tenantId: string,
  professorId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  const { endpoint, keys } = subscription;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new AppError('endpoint, p256dh e auth são obrigatórios', 400);
  }

  const { error } = await supabase
    .from('notificacoes_subscriptions')
    .upsert({
      tenant_id: tenantId,
      professor_id: professorId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'endpoint' });

  if (error) throw new AppError(`Erro ao salvar inscrição: ${error.message}`, 500);
}

export async function unsubscribe(endpoint: string): Promise<number> {
  if (!endpoint) {
    throw new AppError('endpoint é obrigatório', 400);
  }

  const { error, count } = await supabase
    .from('notificacoes_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) throw new AppError(`Erro ao remover inscrição: ${error.message}`, 500);

  return count || 0;
}

export async function getConfig(professorId: string): Promise<any> {
  const { data, error } = await supabase
    .from('notificacoes_config')
    .select('*')
    .eq('professor_id', professorId)
    .maybeSingle();

  if (error) throw new AppError(`Erro ao buscar configuração: ${error.message}`, 500);

  return data || {
    ativo: true,
    frequencia_dia: '1x',
    horarios: ['0600'],
    dias_semana: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
  };
}

export async function updateConfig(
  tenantId: string,
  professorId: string,
  config: { ativo?: boolean; frequencia_dia?: string; horarios?: string[]; dias_semana?: string[] },
): Promise<any> {
  const { ativo, frequencia_dia, horarios, dias_semana } = config;

  const payload: Record<string, any> = { tenant_id: tenantId, professor_id: professorId };
  if (typeof ativo === 'boolean') payload.ativo = ativo;
  if (frequencia_dia) payload.frequencia_dia = frequencia_dia;
  if (horarios) payload.horarios = horarios;
  if (dias_semana) payload.dias_semana = dias_semana;

  const { data, error } = await supabase
    .from('notificacoes_config')
    .upsert(payload, { onConflict: 'professor_id' })
    .select()
    .single();

  if (error) throw new AppError(`Erro ao salvar configuração: ${error.message}`, 500);

  return data;
}
