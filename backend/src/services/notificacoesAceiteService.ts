import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export interface NotificacaoAceite {
  id: string;
  tenant_id: string;
  transferencia_id: string;
  aluno_id: string;
  aluno_nome: string;
  unidade_destino: string;
  professor_destino: string | null;
  grupo_id: string | null;
  lida: boolean;
  criado_em: string;
}

export async function criarNotificacaoAceite(params: {
  tenantId: string;
  transferenciaId: string;
  alunoId: string;
  alunoNome: string;
  unidadeDestino: string;
  professorDestino?: string;
  grupoId?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('notificacoes_aceite')
    .insert({
      tenant_id: params.tenantId,
      transferencia_id: params.transferenciaId,
      aluno_id: params.alunoId,
      aluno_nome: params.alunoNome,
      unidade_destino: params.unidadeDestino,
      professor_destino: params.professorDestino || null,
      grupo_id: params.grupoId || null,
    });

  if (error) {
    console.error('[notificacoesAceite/criar] Erro ao inserir notificação:', error.message);
  }
}

export async function listarNaoVistas(tenantId: string): Promise<NotificacaoAceite[]> {
  const { data, error } = await supabase
    .from('notificacoes_aceite')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('lida', false)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[notificacoesAceite/listar] Erro:', error.message);
    return [];
  }
  return data || [];
}

export async function contarNaoVistas(tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notificacoes_aceite')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('lida', false);

  if (error) return 0;
  return count || 0;
}

export async function marcarComoVista(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('notificacoes_aceite')
    .update({ lida: true })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[notificacoesAceite/marcar] Erro:', error.message);
  }
}

export async function marcarTodasComoVistas(tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('notificacoes_aceite')
    .update({ lida: true })
    .eq('tenant_id', tenantId)
    .eq('lida', false);

  if (error) {
    console.error('[notificacoesAceite/marcarTodas] Erro:', error.message);
  }
}
