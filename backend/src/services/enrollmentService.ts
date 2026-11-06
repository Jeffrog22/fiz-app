import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export interface EnrollmentPeriod {
  id: string;
  tenant_id: string;
  aluno_id: string;
  turma_id?: string | null;
  nivel?: string;
  data_inicio: string;
  data_fim?: string | null;
  motivo: string;
  criado_em: string;
}

const LOTE_ALUNOS = 100;

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

  if (error) {
    console.error('[enrollment/listarPeriodos] Supabase error:', error);
    throw new AppError('Erro ao buscar períodos do aluno', 500);
  }
  return data || [];
}

export async function listarPeriodosPorAlunosService(
  alunoIds: string[],
  tenantId: string,
): Promise<EnrollmentPeriod[]> {
  const ids = [...new Set(alunoIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const periodos: EnrollmentPeriod[] = [];

  for (let i = 0; i < ids.length; i += LOTE_ALUNOS) {
    const lote = ids.slice(i, i + LOTE_ALUNOS);
    const { data, error } = await supabase
      .from('enrollment_period')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('aluno_id', lote)
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('[enrollment/listarPeriodosPorAlunos] Supabase error:', error);
      throw new AppError('Erro ao buscar períodos dos alunos', 500);
    }

    periodos.push(...(data || []));
  }

  return periodos;
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

  if (error) {
    console.error('[enrollment/buscarPeriodoAtivo] Supabase error:', error);
    throw new AppError('Erro ao buscar período ativo', 500);
  }
  return data;
}

export async function fecharPeriodoAtivoService(
  alunoId: string,
  tenantId: string,
  motivo: string,
): Promise<void> {
  const periodoAtivo = await buscarPeriodoAtivoService(alunoId, tenantId);

  if (periodoAtivo) {
    const { error } = await supabase
      .from('enrollment_period')
      .update({
        data_fim: new Date().toISOString().split('T')[0],
        motivo,
      })
      .eq('id', periodoAtivo.id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[enrollment/fecharPeriodoAtivo] Update error:', error);
      throw new AppError('Erro ao encerrar período ativo', 500);
    }
  }
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

    if (updateError) {
      console.error('[enrollment/iniciarPeriodo] Update error:', updateError);
      throw new AppError('Erro ao encerrar período anterior', 500);
    }
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
    .maybeSingle();

  if (error || !data) {
    console.error('[enrollment/iniciarPeriodo] Insert error:', error);
    throw new AppError('Erro ao criar período', 500);
  }
  return data;
}
