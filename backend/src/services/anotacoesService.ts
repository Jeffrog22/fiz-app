import { supabase } from './supabaseClient';
import { AnotacaoAluno } from '../types';
import { AppError } from '../middleware/errorHandler';

export async function listarPorAluno(alunoId: string, tenantId: string): Promise<AnotacaoAluno[]> {
  const { data, error } = await supabase
    .from('anotacoes_alunos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false });

  if (error) throw new AppError('Erro ao buscar anotações', 500);
  return data || [];
}

export async function listarPorAlunos(alunoIds: string[], tenantId: string): Promise<AnotacaoAluno[]> {
  if (alunoIds.length === 0) return [];
  const { data, error } = await supabase
    .from('anotacoes_alunos')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('aluno_id', alunoIds);

  if (error) throw new AppError('Erro ao buscar anotações', 500);
  return data || [];
}

export async function criar(tenantId: string, alunoId: string, anotacao: string, criadoPor?: string): Promise<AnotacaoAluno> {
  if (!alunoId || !anotacao.trim()) throw new AppError('Campos obrigatórios: aluno_id, anotacao', 400);

  const { data, error } = await supabase
    .from('anotacoes_alunos')
    .insert({
      tenant_id: tenantId,
      aluno_id: alunoId,
      anotacao: anotacao.trim(),
      criado_por: criadoPor,
    })
    .select()
    .single();

  if (error) throw new AppError('Erro ao criar anotação', 500);
  return data;
}

export async function atualizar(id: string, anotacao: string, tenantId: string): Promise<AnotacaoAluno> {
  if (!anotacao.trim()) throw new AppError('Anotacao nao pode ser vazia', 400);

  const { data, error } = await supabase
    .from('anotacoes_alunos')
    .update({ anotacao: anotacao.trim(), atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw new AppError('Erro ao atualizar anotação', 500);
  return data;
}

export async function remover(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('anotacoes_alunos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao remover anotação', 500);
}
