import webpush from 'web-push';
import { supabase } from './supabaseClient';
import { getVapidKeys } from '../utils/vapidKeys';

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const vapidKeys = getVapidKeys();
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn('[notifications] VAPID keys não configuradas — scheduler desativado');
    return;
  }
  webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
  initialized = true;
}

function getCurrentHorario(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function getCurrentDiaSemana(): string {
  const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  return dias[new Date().getDay()];
}

async function processarNotificacoes() {
  try {
    const horarioAtual = getCurrentHorario();
    const diaSemana = getCurrentDiaSemana();

    const { data: configs, error } = await supabase
      .from('notificacoes_config')
      .select('*')
      .eq('ativo', true);

    if (error) {
      console.error('[notifications] Erro ao buscar configurações:', error.message);
      return;
    }

    if (!configs || configs.length === 0) return;

    for (const config of configs) {
      const horarios: string[] = config.horarios || [];
      const diasSemana: string[] = config.dias_semana || [];

      if (!horarios.includes(horarioAtual)) continue;
      if (!diasSemana.includes(diaSemana)) continue;

      await enviarNotificacao(config.professor_id);
    }
  } catch (err: any) {
    console.error('[notifications] Erro no scheduler:', err.message);
  }
}

async function enviarNotificacao(professorId: string) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('notificacoes_subscriptions')
      .select('*')
      .eq('professor_id', professorId);

    if (error) {
      console.error(`[notifications] Erro ao buscar subscriptions para ${professorId}:`, error.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: 'Fiz! App',
      body: 'Hora de registrar a chamada!',
      icon: '/favicon.ico',
      data: { url: '/chamadas' },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.info(`[notifications] Removendo subscription inválida: ${sub.endpoint}`);
          await supabase
            .from('notificacoes_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error(`[notifications] Erro ao enviar notificação para ${sub.endpoint}:`, err.message);
        }
      }
    }
  } catch (err: any) {
    console.error(`[notifications] Erro ao enviar notificação para ${professorId}:`, err.message);
  }
}

export function startNotificationScheduler() {
  ensureInitialized();
  if (!initialized) {
    console.warn('[notifications] Scheduler não iniciado — VAPID keys ausentes');
    return;
  }
  console.log('[notifications] Iniciando scheduler de notificações (intervalo: 1 minuto)');
  processarNotificacoes();
  setInterval(processarNotificacoes, 60 * 1000);
}
