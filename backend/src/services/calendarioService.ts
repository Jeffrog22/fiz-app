import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export async function listar(tenantId: string, mes?: number, ano?: number): Promise<any[]> {
  let query = supabase.from('calendario').select('*').eq('tenant_id', tenantId);
  if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    const inicio = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
    const fim = `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;
    query = query.gte('data', inicio).lte('data', fim);
  }
  const { data, error } = await query.order('data', { ascending: true });
  if (error) {
    console.error('[calendarioService.listar]', error);
    throw new AppError('Erro ao buscar calendario', 500);
  }
  return data || [];
}

export async function salvarPeriodo(
  tenantId: string,
  periodo: { inicio_aulas?: string; ferias_inicio?: string; ferias_fim?: string; termino_aulas?: string },
): Promise<void> {
  const { inicio_aulas, ferias_inicio, ferias_fim, termino_aulas } = periodo;

  const { data: existing, error: queryError } = await supabase
    .from('periodos_letivos')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (queryError) {
    console.error('[calendarioService.salvarPeriodo] erro ao verificar', queryError);
    throw new AppError('Erro ao verificar periodo', 500);
  }

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('periodos_letivos')
      .update({ inicio_aulas, ferias_inicio, ferias_fim, termino_aulas })
      .eq('tenant_id', tenantId);
    if (error) {
      console.error('[calendarioService.salvarPeriodo] erro ao atualizar', error);
      throw new AppError('Erro ao atualizar periodo', 500);
    }
  } else {
    const { error } = await supabase
      .from('periodos_letivos')
      .insert({ tenant_id: tenantId, inicio_aulas, ferias_inicio, ferias_fim, termino_aulas });
    if (error) {
      console.error('[calendarioService.salvarPeriodo] erro ao criar', error);
      throw new AppError('Erro ao criar periodo', 500);
    }
  }
}

export async function obterPeriodo(tenantId: string): Promise<any> {
  const { data, error } = await supabase
    .from('periodos_letivos')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[calendarioService.obterPeriodo]', error);
    throw new AppError('Erro ao buscar periodo', 500);
  }
  return data || null;
}

export async function salvarEvento(tenantId: string, data: string, tipo: string, descricao?: string): Promise<void> {
  if (!data || !tipo) throw new AppError('Campos data e tipo sao obrigatorios', 400);

  const { data: existing, error: queryError } = await supabase
    .from('calendario')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('tipo', tipo)
    .limit(1);

  if (queryError) {
    console.error('[calendarioService.salvarEvento] erro ao verificar', queryError);
    throw new AppError('Erro ao verificar evento', 500);
  }

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('calendario')
      .update({ descricao })
      .eq('id', existing[0].id);
    if (error) {
      console.error('[calendarioService.salvarEvento] erro ao atualizar', error);
      throw new AppError('Erro ao atualizar evento', 500);
    }
  } else {
    const { error } = await supabase
      .from('calendario')
      .insert({ tenant_id: tenantId, data, tipo, descricao });
    if (error) {
      console.error('[calendarioService.salvarEvento] erro ao criar', error);
      throw new AppError('Erro ao criar evento', 500);
    }
  }
}

export async function removerEvento(tenantId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('calendario')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) {
    console.error('[calendarioService.removerEvento]', error);
    throw new AppError('Erro ao remover evento', 500);
  }
}

export async function aplicarFerias(
  tenantId: string,
  feriasInicio: string,
  feriasFim: string,
): Promise<{ ok: boolean; count: number }> {
  if (!feriasInicio || !feriasFim) throw new AppError('ferias_inicio e ferias_fim sao obrigatorios', 400);

  const inicio = new Date(feriasInicio);
  const fim = new Date(feriasFim);
  if (fim < inicio) throw new AppError('ferias_fim deve ser posterior a ferias_inicio', 400);

  const eventos: { tenant_id: string; data: string; tipo: string; descricao: string }[] = [];
  const current = new Date(inicio);
  while (current <= fim) {
    const diaSemana = current.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      const dataStr = current.toISOString().split('T')[0];
      eventos.push({ tenant_id: tenantId, data: dataStr, tipo: 'ferias', descricao: 'Férias' });
    }
    current.setDate(current.getDate() + 1);
  }

  if (eventos.length === 0) return { ok: true, count: 0 };

  const { error } = await supabase
    .from('calendario')
    .upsert(eventos, { onConflict: 'tenant_id,data,tipo', ignoreDuplicates: false });

  if (error) {
    console.error('[calendarioService.aplicarFerias]', error);
    throw new AppError('Erro ao aplicar ferias no calendario', 500);
  }

  console.info(`[calendarioService.aplicarFerias] ${eventos.length} dias de ferias inseridos para tenant ${tenantId}`);
  return { ok: true, count: eventos.length };
}

export async function removerFerias(
  tenantId: string,
  feriasInicio?: string,
  feriasFim?: string,
): Promise<{ ok: boolean; count: number }> {
  let query = supabase
    .from('calendario')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('tipo', 'ferias');

  if (feriasInicio && feriasFim) {
    query = query.gte('data', feriasInicio).lte('data', feriasFim);
  }

  const { data, error } = await query.select('id');

  if (error) {
    console.error('[calendarioService.removerFerias]', error);
    throw new AppError('Erro ao remover ferias do calendario', 500);
  }

  const count = data?.length || 0;
  console.info(`[calendarioService.removerFerias] ${count} dias de ferias removidos para tenant ${tenantId}`);
  return { ok: true, count };
}
