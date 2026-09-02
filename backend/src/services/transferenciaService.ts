import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { calcularCategoria } from '../utils/categoria';
import { iniciarPeriodoService } from './enrollmentService';

export async function criar(
  tenantId: string,
  professorId: string,
  alunoId: string,
  tenantDestino: string,
  turmaSugerida?: string,
  motivo?: string,
): Promise<any> {
  if (tenantDestino === tenantId) {
    throw new AppError('Unidade destino deve ser diferente da origem', 400);
  }

  const { data: aluno, error: alunoError } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', alunoId)
    .eq('tenant_id', tenantId)
    .single();

  if (alunoError || !aluno) {
    throw new AppError('Aluno nao encontrado', 404);
  }

  const { data: turma } = await supabase
    .from('turmas')
    .select('label, horario, professor_id, nivel')
    .eq('tenant_id', tenantId)
    .eq('grupo_id', aluno.turma_id || '')
    .maybeSingle();

  const { data: professor } = turma?.professor_id
    ? await supabase
        .from('professores')
        .select('nome')
        .eq('id', turma.professor_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
    : { data: null };

  const dadosAluno = {
    nome: aluno.nome,
    data_nascimento: aluno.data_nascimento,
    genero: aluno.genero,
    contato: aluno.contato,
    par_q: aluno.par_q,
    par_q_data: aluno.par_q_data,
    atestado_medico: aluno.atestado_medico,
    data_atestado: aluno.data_atestado,
    turma_label: turma?.label || null,
    turma_horario: turma?.horario || null,
    turma_professor: professor?.nome || null,
  };

  const { data, error } = await supabase
    .from('transferencia_unidade')
    .insert({
      tenant_id: tenantId,
      tenant_destino: tenantDestino,
      aluno_id: alunoId,
      dados_aluno: dadosAluno,
      turma_sugerida: turmaSugerida || aluno.turma_id || null,
      motivo: motivo || null,
      criado_por: professorId,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[transferencia/criar] Supabase error:', error);
    throw new AppError('Erro ao criar intencao de transferencia', 500);
  }

  return data;
}

export async function criarLote(
  tenantId: string,
  professorId: string,
  alunoIds: string[],
  tenantDestino: string,
  motivo?: string,
): Promise<{ criadas: number; erros: string[] }> {
  const erros: string[] = [];
  let criadas = 0;

  for (const alunoId of alunoIds) {
    try {
      await criar(tenantId, professorId, alunoId, tenantDestino, undefined, motivo);
      criadas++;
    } catch (err: any) {
      erros.push(`${alunoId}: ${err.message}`);
    }
  }

  return { criadas, erros };
}

export async function listarEnviadas(tenantId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('transferencia_unidade')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false });

  if (error) throw new AppError('Erro ao buscar transferencias enviadas', 500);
  return data || [];
}

export async function listarRecebidas(tenantId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('transferencia_unidade')
    .select('*')
    .eq('tenant_destino', tenantId)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false });

  if (error) throw new AppError('Erro ao buscar transferencias recebidas', 500);
  return data || [];
}

export async function listarFilaGlobal(): Promise<any[]> {
  const { data, error } = await supabase
    .from('transferencia_unidade')
    .select('*')
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false });

  if (error) throw new AppError('Erro ao buscar fila global de transferencias', 500);
  return data || [];
}

export async function listarHistorico(tenantId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('transferencia_unidade')
    .select('*')
    .or(`tenant_id.eq.${tenantId},tenant_destino.eq.${tenantId}`)
    .neq('status', 'pendente')
    .order('respondido_em', { ascending: false });

  if (error) throw new AppError('Erro ao buscar historico de transferencias', 500);
  return data || [];
}

export async function aceitar(
  id: string,
  tenantId: string,
  professorId: string,
  turmaId?: string,
  nivel?: string,
): Promise<any> {
  const { data: transferencia, error: fetchError } = await supabase
    .from('transferencia_unidade')
    .select('*')
    .eq('id', id)
    .eq('tenant_destino', tenantId)
    .eq('status', 'pendente')
    .single();

  if (fetchError || !transferencia) {
    throw new AppError('Transferencia nao encontrada ou ja processada', 404);
  }

  const dados = transferencia.dados_aluno;
  const categoria = calcularCategoria(dados.data_nascimento);

  const { data: novoAluno, error: insertError } = await supabase
    .from('alunos')
    .insert({
      tenant_id: tenantId,
      nome: dados.nome,
      data_nascimento: dados.data_nascimento || null,
      genero: dados.genero || null,
      contato: dados.contato || null,
      par_q: dados.par_q ?? null,
      par_q_data: dados.par_q_data || null,
      atestado_medico: dados.atestado_medico ?? null,
      data_atestado: dados.data_atestado || null,
      nivel: nivel || null,
      turma_id: turmaId || null,
      categoria: categoria || null,
    })
    .select()
    .single();

  if (insertError || !novoAluno) {
    console.error('[transferencia/aceitar] Erro ao criar aluno:', insertError);
    throw new AppError('Erro ao criar aluno na unidade destino', 500);
  }

  await iniciarPeriodoService(
    novoAluno.id,
    turmaId || null,
    nivel || null,
    'transferencia_externa',
    tenantId,
  );

  const { error: updateError } = await supabase
    .from('transferencia_unidade')
    .update({
      status: 'aceita',
      respondido_em: new Date().toISOString(),
      respondido_por: professorId,
    })
    .eq('id', id)
    .eq('tenant_destino', tenantId);

  if (updateError) {
    console.error('[transferencia/aceitar] Erro ao atualizar status:', updateError);
  }

  return { transferencia, novoAluno };
}

export async function cancelar(
  id: string,
  tenantId: string,
  professorId: string,
): Promise<void> {
  const { data: transferencia, error: fetchError } = await supabase
    .from('transferencia_unidade')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'pendente')
    .single();

  if (fetchError || !transferencia) {
    throw new AppError('Transferencia nao encontrada ou ja processada', 404);
  }

  const { error } = await supabase
    .from('transferencia_unidade')
    .update({
      status: 'cancelada',
      respondido_em: new Date().toISOString(),
      respondido_por: professorId,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao cancelar transferencia', 500);
}

export async function contarPendentesRecebidas(tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transferencia_unidade')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_destino', tenantId)
    .eq('status', 'pendente');

  if (error) return 0;
  return count || 0;
}
