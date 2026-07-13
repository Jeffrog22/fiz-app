import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export function calcularCategoria(dataNascimento?: string): string | undefined {
  if (!dataNascimento) return undefined;
  const nasc = new Date(dataNascimento + 'T12:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;

  if (idade < 9) return 'Pré-Mirim';
  if (idade < 10) return 'Mirim I';
  if (idade < 11) return 'Mirim II';
  if (idade < 12) return 'Petiz I';
  if (idade < 13) return 'Petiz II';
  if (idade < 14) return 'Infantil I';
  if (idade < 15) return 'Infantil II';
  if (idade < 16) return 'Juvenil I';
  if (idade < 17) return 'Juvenil II';
  if (idade < 18) return 'Júnior I';
  if (idade < 20) return 'Júnior II/Sênior';
  if (idade < 25) return 'A20+';
  if (idade < 30) return 'B25+';
  if (idade < 35) return 'C30+';
  if (idade < 40) return 'D35+';
  if (idade < 45) return 'E40+';
  if (idade < 50) return 'F45+';
  if (idade < 55) return 'G50+';
  if (idade < 60) return 'H55+';
  if (idade < 65) return 'I60+';
  if (idade < 70) return 'J65+';
  if (idade < 75) return 'K70+';
  if (idade < 80) return 'L75+';
  return 'M80+';
}

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
    par_q, atestado_medico, data_atestado,
    nivel, turma_id,
  } = data;

  if (!nome || nome.trim().length === 0) {
    throw new AppError('Nome do aluno e obrigatorio', 400);
  }

  const { data: existente } = await supabase
    .from('alunos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('nome', nome.trim())
    .maybeSingle();

  if (existente) {
    throw new AppError('Aluno ja cadastrado nesta unidade', 400);
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
    par_q, atestado_medico, data_atestado,
    nivel, turma_id,
  } = data;

  const categoria = data_nascimento ? calcularCategoria(data_nascimento) : undefined;

  const { data: result, error } = await supabase
    .from('alunos')
    .update({
      nome: nome?.trim(),
      data_nascimento,
      genero,
      contato,
      ativo,
      par_q,
      atestado_medico,
      data_atestado,
      nivel: nivel || null,
      turma_id: turma_id || null,
      categoria: categoria || null,
    })
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

export async function removerAlunoService(id: string, tenantId: string): Promise<void> {
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
      motivo: 'remocao',
    });

  if (insertError) {
    console.error('[alunos/remover] Erro ao registrar exclusao:', insertError);
  }
}
