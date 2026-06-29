import { supabase } from './supabaseClient';
import { ChamadaLog } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchWeather } from '../utils/weather';

export async function listarPorData(data: string, tenantId: string): Promise<any[]> {
  const { data: logs, error } = await supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .order('indice_aula', { ascending: true });

  if (error) throw new AppError('Erro ao buscar chamadas', 500);
  return logs || [];
}

export async function listarPorPeriodo(inicio: string, fim: string, tenantId: string): Promise<any[]> {
  if (!inicio || !fim) {
    throw new AppError('Parametros inicio e fim sao obrigatorios', 400);
  }

  const { data: logs, error } = await supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true })
    .order('indice_aula', { ascending: true });

  if (error) throw new AppError('Erro ao buscar chamadas', 500);
  return logs || [];
}

export async function salvar(registros: any[], tenantId: string): Promise<void> {
  if (!Array.isArray(registros)) {
    throw new AppError('Payload invalido', 400);
  }

  const resultados = await Promise.all(
    registros.map(async (item: any) => {
      const { data, error } = await supabase
        .from('chamadas_log')
        .upsert({
          ...item,
          tenant_id: tenantId,
        })
        .select()
        .single();
      return { item, data, error };
    })
  );

  const comErro = resultados.find((r) => r.error);
  if (comErro?.error) {
    throw new AppError('Erro ao salvar chamadas', 500);
  }
}

export async function extrapolarPresenca(data: string, indice_aula: number | undefined, tenantId: string): Promise<{ message: string; count: number }> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const aulaIdx = indice_aula ?? 0;

  const { data: existingLogs, error: fetchError } = await supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', aulaIdx);

  if (fetchError) throw new AppError('Erro ao verificar chamadas existentes', 500);

  if (existingLogs && existingLogs.length > 0) {
    return { message: 'Chamadas ja existem para esta data/aula', count: existingLogs.length };
  }

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const novosLogs = (alunos || []).map((aluno: any) => ({
    tenant_id: tenantId,
    data,
    grupo_id: aluno.id,
    indice_aula: aulaIdx,
    status: 'presente',
    origem: 'extrapolado',
  }));

  if (novosLogs.length === 0) {
    return { message: 'Nenhum aluno ativo para extrapolar', count: 0 };
  }

  const { error: insertError } = await supabase
    .from('chamadas_log')
    .insert(novosLogs);

  if (insertError) throw new AppError('Erro ao extrapolar presenca', 500);

  return { message: `Presenca extrapolada para ${novosLogs.length} alunos`, count: novosLogs.length };
}

export async function salvarCardAula(
  tenantId: string,
  data: string,
  indice_aula: number | undefined,
  temperatura_piscina?: number,
  cloro_ppm?: number,
  condicao_clima?: string,
): Promise<void> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const aulaIdx = indice_aula ?? 0;

  const { data: registros, error: fetchError } = await supabase
    .from('chamadas_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', aulaIdx)
    .limit(1);

  if (fetchError) throw new AppError('Erro ao buscar registros', 500);

  if (registros && registros.length > 0) {
    const { error: updateError } = await supabase
      .from('chamadas_log')
      .update({
        temperatura_piscina,
        cloro_ppm,
        condicao_clima,
      })
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', aulaIdx);

    if (updateError) throw new AppError('Erro ao atualizar CardAula', 500);
  }
}

export async function salvarCardBO(
  tenantId: string,
  data: string,
  indice_aula: number | undefined,
  tipo_select?: string,
  tipo_ocorrencia?: string,
  motivo?: string,
  grupo_id?: string,
): Promise<void> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const aulaIdx = indice_aula ?? 0;

  if (grupo_id) {
    const { error: upsertError } = await supabase
      .from('chamadas_log')
      .upsert({
        tenant_id: tenantId,
        data,
        grupo_id,
        indice_aula: aulaIdx,
        tipo_select: tipo_select || 'pessoal',
        tipo_ocorrencia: tipo_ocorrencia || 'Outro',
        status: 'justificado',
        motivo: motivo || '',
        origem: 'manual',
      });

    if (upsertError) throw new AppError('Erro ao salvar BO', 500);
  } else {
    const { data: registros, error: fetchError } = await supabase
      .from('chamadas_log')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', aulaIdx)
      .limit(1);

    if (fetchError) throw new AppError('Erro ao buscar registros', 500);

    if (registros && registros.length > 0) {
      const { error: updateError } = await supabase
        .from('chamadas_log')
        .update({
          tipo_select: tipo_select || 'pessoal',
          tipo_ocorrencia,
          motivo,
        })
        .eq('tenant_id', tenantId)
        .eq('data', data)
        .eq('indice_aula', aulaIdx);

      if (updateError) throw new AppError('Erro ao atualizar BO', 500);
    }
  }
}

export async function registrarLogAcesso(tenantId: string, professorId?: string, ip?: string): Promise<void> {
  const { data: professor } = await supabase
    .from('professores')
    .select('nome')
    .eq('id', professorId)
    .single();

  const { error } = await supabase
    .from('logs_acesso')
    .insert({
      tenant_id: tenantId,
      professor: professor?.nome || 'desconhecido',
      unidade: tenantId,
      status: 'sucesso',
      ip: ip || 'desconhecido',
    });

  if (error) console.error('Erro ao registrar log de acesso:', error.message);
}

export async function obterCardAula(data: string, indice_aula: number, tenantId: string): Promise<any> {
  const { data: registros, error } = await supabase
    .from('chamadas_log')
    .select('condicao_clima, temperatura_piscina, cloro_ppm')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula)
    .not('temperatura_piscina', 'is', null)
    .limit(1);

  if (error) throw new AppError('Erro ao buscar CardAula', 500);

  return registros && registros.length > 0 ? registros[0] : null;
}

const condicoes: Record<number, string> = {
  0: 'C\u00e9u Limpo', 1: 'Principalmente Limpo',
  2: 'Parcialmente Nublado', 3: 'Nublado',
  45: 'N\u00e9voa Seca', 48: 'Nevoeiro/Geadas',
  51: 'Chuvisco', 53: 'Chuvisco', 55: 'Chuvisco',
  56: 'Chuvisco Congelante', 57: 'Chuvisco Congelante',
  61: 'Chuva', 63: 'Chuva', 65: 'Chuva',
  66: 'Chuva Congelante', 67: 'Chuva Congelante',
  71: 'Neve', 73: 'Neve', 75: 'Neve',
  77: 'Gr\u00e3os de Neve',
  80: 'Pancadas de Chuva', 81: 'Pancadas de Chuva', 82: 'Pancadas de Chuva',
  85: 'Pancadas de Neve', 86: 'Pancadas de Neve',
  95: 'Tempestade', 96: 'Tempestade com Granizo', 99: 'Tempestade com Granizo',
};

export async function obterClima(): Promise<any> {
  const data = await fetchWeather();

  if (!data.ok || !data.raw) {
    return {
      ok: false,
      temperatura: 26.0,
      condicao: 'Parcialmente Nublado',
      weatherCode: 2,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const daily = data.raw.daily;
  if (!daily) {
    return {
      ok: false,
      temperatura: 26.0,
      condicao: 'Parcialmente Nublado',
      weatherCode: 2,
    };
  }

  const todayIdx = daily.time.indexOf(today);
  const idx = todayIdx >= 0 ? todayIdx : 0;

  const weatherCode = daily.weather_code?.[idx] ?? 2;
  const tempMax = daily.temperature_2m_max?.[idx];
  const tempMin = daily.temperature_2m_min?.[idx];
  const precipitacao = daily.precipitation_probability_max?.[idx] ?? 0;

  return {
    ok: true,
    temperatura: tempMax ?? 26.0,
    temperaturaMin: tempMin ?? 18.0,
    weatherCode,
    condicao: condicoes[weatherCode] || 'Desconhecido',
    precipitacao,
  };
}

export async function obterLogsAcesso(tenantId: string, limit: number = 50): Promise<any[]> {
  const { data: logs, error } = await supabase
    .from('logs_acesso')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw new AppError('Erro ao buscar logs de acesso', 500);

  return logs || [];
}
