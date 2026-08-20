import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { calcularCategoria } from '../utils/categoria';

export { calcularCategoria };

export async function listarAlunosService(
  tenantId: string,
  filters: { nome?: string; ativo?: string },
): Promise<any[]> {
  let query = supabase
    .from('alunos')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters.nome) query = query.ilike('nome', `%${filters.nome}%`);
  if (filters.ativo !== undefined) query = query.eq('ativo', filters.ativo === 'true');

  const { data, error } = await query.order('nome', { ascending: true });

  if (error) {
    console.error('[alunos/listar] Supabase error:', error);
    throw new AppError(`Erro ao buscar alunos: ${error.message}`, 500);
  }
  console.info(`[alunos/listar] ${data?.length || 0} alunos retornados para tenant ${tenantId}`);
  return data || [];
}

export async function criarAlunoService(data: any, tenantId: string): Promise<any> {
  const {
    nome, data_nascimento, genero, contato,
    par_q, par_q_data, atestado_medico, data_atestado,
    nivel, turma_id,
  } = data;

  if (!nome || nome.trim().length === 0) {
    throw new AppError('Nome do aluno e obrigatorio', 400);
  }

  if (!data.duplicar_cadastro) {
    const { data: existente } = await supabase
      .from('alunos')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('nome', nome.trim())
      .maybeSingle();

    if (existente) {
      throw new AppError('Aluno ja cadastrado nesta unidade', 400);
    }
  }

  const categoria = calcularCategoria(data_nascimento);

  const { data: result, error } = await supabase
    .from('alunos')
    .insert({
      tenant_id: tenantId,
      nome: nome.trim(),
      data_nascimento: data_nascimento || null,
      genero: genero || null,
      contato: contato || null,
      par_q: par_q ?? null,
      par_q_data: par_q_data || null,
      atestado_medico: atestado_medico ?? null,
      data_atestado: data_atestado || null,
      nivel: nivel || null,
      turma_id: turma_id || null,
      categoria: categoria || null,
    })
    .select()
    .single();

  if (error || !result) {
    console.error('[alunos/criar] Supabase error:', error);
    throw new AppError('Erro ao criar aluno', 500);
  }
  return result;
}

export async function atualizarAlunoService(id: string, data: any, tenantId: string): Promise<any> {
  const {
    nome, data_nascimento, genero, contato, ativo,
    par_q, par_q_data, atestado_medico, data_atestado,
    nivel, turma_id,
  } = data;

  const categoria = data_nascimento ? calcularCategoria(data_nascimento) : undefined;

  const updateBody: Record<string, any> = {
    nome: nome?.trim(),
    data_nascimento,
    genero,
    contato,
    ativo,
    par_q,
    par_q_data,
    atestado_medico,
    data_atestado,
    nivel: nivel || null,
    categoria: categoria || null,
  };

  if (turma_id !== undefined) updateBody.turma_id = turma_id || null;

  const { data: result, error } = await supabase
    .from('alunos')
    .update(updateBody)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error || !result) {
    console.error('[alunos/atualizar] Supabase error:', error);
    throw new AppError('Erro ao atualizar aluno', 500);
  }
  return result;
}

export async function buscarPorIdService(id: string, tenantId: string): Promise<any> {
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new AppError('Aluno não encontrado', 404);
  }
  return data;
}

export async function removerAlunoService(id: string, tenantId: string, motivo = 'falta'): Promise<void> {
  const { error } = await supabase
    .from('alunos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao remover aluno', 500);

  const { error: insertError } = await supabase
    .from('exclusoes')
    .insert({
      tenant_id: tenantId,
      aluno_id: id,
      motivo,
    });

  if (insertError) {
    console.error('[alunos/remover] Erro ao registrar exclusao:', insertError);
  }
}
