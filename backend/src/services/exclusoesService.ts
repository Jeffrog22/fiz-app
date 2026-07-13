import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export async function listar(tenantId: string, mostrarOcultos?: string): Promise<any[]> {
  let query = supabase
    .from('exclusoes')
    .select('*')
    .eq('tenant_id', tenantId);

  if (mostrarOcultos !== 'true') {
    query = query.eq('oculto', false);
  }

  const { data, error } = await query.order('data_exclusao', { ascending: false });
  if (error) throw new AppError('Erro ao buscar exclusoes', 500);

  if (!data || data.length === 0) return [];

  const alunoIds = data.map((e) => e.aluno_id).filter(Boolean);
  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id, nome, turma_id, nivel, contato, ativo')
    .in('id', alunoIds);

  if (alunosError) {
    console.error('[exclusoes/listar] Erro ao buscar alunos:', alunosError);
  }

  const alunoMap = new Map((alunos || []).map((a) => [a.id, a]));

  return data.map((e) => ({
    ...e,
    alunos: alunoMap.get(e.aluno_id) || null,
  }));
}

export async function restaurar(id: string, tenantId: string, turma_id?: string): Promise<void> {
  if (!id) throw new AppError('ID da exclusao e obrigatorio', 400);

  const { data: exclusao, error: fetchError } = await supabase
    .from('exclusoes')
    .select('aluno_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !exclusao) throw new AppError('Exclusao nao encontrada', 404);

  const updateData: any = { ativo: true };
  if (turma_id) updateData.turma_id = turma_id;

  const { error: updateError } = await supabase
    .from('alunos')
    .update(updateData)
    .eq('id', exclusao.aluno_id)
    .eq('tenant_id', tenantId);

  if (updateError) throw new AppError('Erro ao restaurar aluno', 500);

  const { error: deleteError } = await supabase
    .from('exclusoes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (deleteError) throw new AppError('Erro ao remover exclusao', 500);
}

export async function atualizar(id: string, tenantId: string, data: { motivo?: string; data_exclusao?: string }): Promise<void> {
  const { error } = await supabase
    .from('exclusoes')
    .update(data)
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao atualizar exclusao', 500);
}

export async function excluirDefinitivo(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('exclusoes')
    .update({ oculto: true })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao ocultar exclusao', 500);
}
