import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export interface EnrollmentPeriod {
  id: string;
  tenant_id: string;
  aluno_id: string;
  turma_id?: string;
  nivel?: string;
  data_inicio: string;
  data_fim?: string;
  motivo: string;
  criado_em: string;
}

export async function listarPeriodosService(
  alunoId: string,
  tenantId: string,
): Promise<EnrollmentPeriod[]> {
  const { data, error } = await supabase
    .from('enrollment_period')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('tenant_id', tenantId)
    .order('data_inicio', { ascending: false });

  if (error) throw new AppError('Erro ao buscar períodos do aluno', 500);
  return data || [];
}

export async function buscarPeriodoAtivoService(
  alunoId: string,
  tenantId: string,
): Promise<EnrollmentPeriod | null> {
  const { data, error } = await supabase
    .from('enrollment_period')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('tenant_id', tenantId)
    .is('data_fim', null)
    .maybeSingle();

  if (error) throw new AppError('Erro ao buscar período ativo', 500);
  return data;
}

export async function iniciarPeriodoService(
  alunoId: string,
  turmaId: string | null,
  nivel: string | null,
  motivo: string,
  tenantId: string,
): Promise<EnrollmentPeriod> {
  const periodoAtivo = await buscarPeriodoAtivoService(alunoId, tenantId);

  if (periodoAtivo) {
    const { error: updateError } = await supabase
      .from('enrollment_period')
      .update({ data_fim: new Date().toISOString().split('T')[0] })
      .eq('id', periodoAtivo.id)
      .eq('tenant_id', tenantId);

    if (updateError) throw new AppError('Erro ao encerrar período anterior', 500);
  }

  const { data, error } = await supabase
    .from('enrollment_period')
    .insert({
      tenant_id: tenantId,
      aluno_id: alunoId,
      turma_id: turmaId || null,
      nivel: nivel || null,
      motivo,
      data_inicio: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error || !data) throw new AppError('Erro ao criar período', 500);
  return data;
}
