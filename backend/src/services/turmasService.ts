import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { generateGrupoId, gerarLabelFromDias } from '../utils/idGenerator';

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
  const { dias, horario, professor_id, nivel, capacidade, faixa_etaria } = data;

  if (!dias || dias.length === 0 || !horario) {
    throw new AppError('Dias e horário são obrigatórios', 400);
  }

  const label = gerarLabelFromDias(dias);

  // Valida chave tríplice
  const { data: existing } = await supabase
    .from('turmas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('label', label)
    .eq('horario', horario)
    .eq('professor_id', professor_id || null)
    .maybeSingle();

  if (existing) {
    throw new AppError('Já existe turma com esse label, horário e professor', 409);
  }

  // Gera grupo_id
  const { data: allGrupos } = await supabase
    .from('turmas')
    .select('grupo_id')
    .eq('tenant_id', tenantId)
    .not('grupo_id', 'is', null);

  const existingIds = (allGrupos || []).map((g: any) => g.grupo_id);
  const grupoId = generateGrupoId(professor_id || '', dias, existingIds);

  const payload = {
    tenant_id: tenantId,
    label,
    grupo_id: grupoId,
    horario,
    professor_id: professor_id || null,
    nivel: nivel || null,
    capacidade: capacidade ?? null,
    faixa_etaria: faixa_etaria || null,
  };

  const { data: result, error } = await supabase
    .from('turmas')
    .insert(payload)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar turma: ${error.message}`, 500);
  if (!result) throw new AppError('Erro ao criar turma: nenhum retorno do banco', 500);
  return result;
}

export async function atualizarTurmaService(id: string, data: any, tenantId: string): Promise<any> {
  const { label, horario, professor_id, nivel, capacidade, faixa_etaria } = data;

  // Valida chave tríplice (excluindo a si mesmo)
  const { data: existing } = await supabase
    .from('turmas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('label', label)
    .eq('horario', horario)
    .eq('professor_id', professor_id || null)
    .neq('id', id)
    .maybeSingle();

  if (existing) {
    throw new AppError('Já existe outra turma com esse label, horário e professor', 409);
  }

  const payload: Record<string, any> = {
    label,
    horario,
  };

  if (professor_id !== undefined) payload.professor_id = professor_id || null;
  if (nivel !== undefined) payload.nivel = nivel || null;
  if (capacidade !== undefined) payload.capacidade = capacidade ?? null;
  if (faixa_etaria !== undefined) payload.faixa_etaria = faixa_etaria || null;

  const { data: result, error } = await supabase
    .from('turmas')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar turma: ${error.message}`, 500);
  if (!result) throw new AppError('Erro ao atualizar turma: nenhum retorno do banco', 500);
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
