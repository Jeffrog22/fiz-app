import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export async function listarTurmasService(
  tenantId: string,
  filters: { nivel?: string; professor_id?: string; horario?: string },
): Promise<any[]> {
  let query = supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('horario', { ascending: true });

  if (filters.nivel) query = query.eq('nivel', filters.nivel);
  if (filters.professor_id) query = query.eq('professor_id', filters.professor_id);
  if (filters.horario) query = query.eq('horario', filters.horario);

  const { data, error } = await query;

  if (error) throw new AppError('Erro ao buscar turmas', 500);
  return data || [];
}

export async function criarTurmaService(data: any, tenantId: string): Promise<any> {
  const { label, horario, professor_id, nivel, capacidade, faixa_etaria } = data;

  if (!label || !horario) {
    throw new AppError('Label e horário são obrigatórios', 400);
  }

  const payload = {
    tenant_id: tenantId,
    label,
    horario,
    professor_id: professor_id || null,
    nivel: nivel || null,
    capacidade: capacidade ?? null,
    faixa_etaria: faixa_etaria || null,
  };

  console.log('[DEBUG criarTurma] payload:', JSON.stringify(payload));

  const { data: result, error } = await supabase
    .from('turmas')
    .insert(payload)
    .select()
    .single();

  console.log('[DEBUG criarTurma] resultado:', JSON.stringify(result), 'erro:', error);

  if (error || !result) throw new AppError('Erro ao criar turma', 500);
  return result;
}

export async function atualizarTurmaService(id: string, data: any, tenantId: string): Promise<any> {
  const { label, horario, professor_id, nivel, capacidade, faixa_etaria } = data;

  const payload: Record<string, any> = {
    label,
    horario,
  };

  if (professor_id !== undefined) payload.professor_id = professor_id || null;
  if (nivel !== undefined) payload.nivel = nivel || null;
  if (capacidade !== undefined) payload.capacidade = capacidade ?? null;
  if (faixa_etaria !== undefined) payload.faixa_etaria = faixa_etaria || null;

  console.log('[DEBUG atualizarTurma] id:', id, 'payload:', JSON.stringify(payload));

  const { data: result, error } = await supabase
    .from('turmas')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  console.log('[DEBUG atualizarTurma] resultado:', JSON.stringify(result), 'erro:', error);

  if (error || !result) throw new AppError('Erro ao atualizar turma', 500);
  return result;
}

export async function excluirTurmaService(id: string, tenantId: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from('alunos')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('turma_id', id);

  if (countError) throw new AppError('Erro ao verificar alunos', 500);

  const { error } = await supabase
    .from('turmas')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao remover turma', 500);
}
