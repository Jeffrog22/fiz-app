import { supabase } from './supabaseClient';
import { ChamadaLog } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchWeather } from '../utils/weather';
import { registrarOperacao } from '../utils/logEngine';

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
      const { error: upsertError } = await supabase
        .from('chamadas_log')
        .upsert(
          { ...item, tenant_id: tenantId },
          { onConflict: 'tenant_id,data,grupo_id,indice_aula' }
        );

      // Se onConflict falhar, faz fallback manual: select + update/insert
      // Tambem trata erro de coluna inexistente (ex: origem) removendo-a do payload
      if (upsertError) {
        console.warn('[salvar] upsert com onConflict falhou, tentando fallback manual:', upsertError.message, 'item:', JSON.stringify(item));

        // Se o erro for de coluna inexistente, remove campos problematicos
        let safeItem = { ...item };
        if (upsertError.message?.includes('origem') || upsertError.message?.includes('column')) {
          delete safeItem.origem;
        }
        if (upsertError.message?.includes('compromete_dia') || upsertError.message?.includes('column')) {
          delete safeItem.compromete_dia;
        }

        const { data: existente } = await supabase
          .from('chamadas_log')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('data', safeItem.data)
          .eq('grupo_id', safeItem.grupo_id)
          .eq('indice_aula', safeItem.indice_aula)
          .maybeSingle();

        if (existente) {
          const { error: updateError } = await supabase
            .from('chamadas_log')
            .update(safeItem)
            .eq('id', existente.id);
          if (updateError) console.error('[salvar] fallback update error:', updateError.message);
          return { item, error: updateError };
        } else {
          const { error: insertError } = await supabase
            .from('chamadas_log')
            .insert({ ...safeItem, tenant_id: tenantId });
          if (insertError) console.error('[salvar] fallback insert error:', insertError.message);
          return { item, error: insertError };
        }
      }

      return { item, error: null };
    })
  );

  const comErro = resultados.find((r) => r.error);
  if (comErro?.error) {
    const msg = comErro.error.message || JSON.stringify(comErro.error);
    console.error('[salvar] Erro:', msg, 'item:', JSON.stringify(comErro.item));
    throw new AppError(`Erro ao salvar chamadas: ${msg}`, 500);
  }
}

export async function aplicarEventoCalendario(
  data: string,
  tipo: string,
  tenantId: string,
): Promise<{ message: string; count: number }> {
  if (!data || !tipo) throw new AppError('Campos data e tipo sao obrigatorios', 400);

  const { data: existingLogs, error: fetchError } = await supabase
    .from('chamadas_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', 0)
    .in('status', ['feriado', 'ponte', 'reuniao', 'evento'])
    .limit(1);

  if (fetchError) {
    console.error('[aplicarEventoCalendario] Erro ao verificar chamadas existentes:', fetchError, 'data:', data, 'tipo:', tipo, 'tenant:', tenantId);
    throw new AppError('Erro ao verificar chamadas existentes', 500);
  }

  if (existingLogs && existingLogs.length > 0) {
    return { message: `Evento ja aplicado para ${data}`, count: 0 };
  }

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (alunosError) {
    console.error('[aplicarEventoCalendario] Erro ao buscar alunos:', alunosError);
    throw new AppError('Erro ao buscar alunos', 500);
  }

  const novosLogs = (alunos || []).map((aluno: any) => ({
    tenant_id: tenantId,
    data,
    grupo_id: aluno.id,
    indice_aula: 0,
    status: tipo,
    origem: 'calendario',
  }));

  if (novosLogs.length === 0) {
    return { message: 'Nenhum aluno ativo para aplicar evento', count: 0 };
  }

  const { error: insertError } = await supabase
    .from('chamadas_log')
    .upsert(novosLogs, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });

  if (insertError) {
    console.error('[aplicarEventoCalendario] upsert falhou, tentando insert manual:', insertError.message, 'data:', data, 'tipo:', tipo);
    const { error: insertFallback } = await supabase
      .from('chamadas_log')
      .insert(novosLogs);
    if (insertFallback) {
      const msg = insertFallback.message || JSON.stringify(insertFallback);
      console.error('[aplicarEventoCalendario] insert manual tambem falhou:', msg);
      throw new AppError(`Erro ao aplicar evento do calendario: ${msg}`, 500);
    }
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: 'calendario',
    dados: { data, tipo, total: novosLogs.length },
  });

  return { message: `Evento ${tipo} aplicado para ${novosLogs.length} alunos`, count: novosLogs.length };
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

  if (fetchError) {
    console.error('[extrapolarPresenca] Erro ao verificar chamadas existentes:', fetchError, 'data:', data, 'indice_aula:', aulaIdx, 'tenant:', tenantId);
    throw new AppError('Erro ao verificar chamadas existentes', 500);
  }

  if (existingLogs && existingLogs.length > 0) {
    return { message: 'Chamadas ja existem para esta data/aula', count: existingLogs.length };
  }

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (alunosError) {
    console.error('[extrapolarPresenca] Erro ao buscar alunos:', alunosError);
    throw new AppError('Erro ao buscar alunos', 500);
  }

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

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: 'extrapolacao',
    dados: { data, indice_aula: aulaIdx, total: novosLogs.length },
  });

  return { message: `Presenca extrapolada para ${novosLogs.length} alunos`, count: novosLogs.length };
}

export async function salvarCardAula(
  tenantId: string,
  data: string,
  indice_aula: number | undefined,
  temperatura_externa?: number,
  temperatura_piscina?: number,
  cloro_ppm?: number,
  condicao_clima?: string,
  sensacao?: string[],
  status_sugerido?: string,
  motivo_sugerido?: string,
): Promise<void> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const aulaIdx = indice_aula ?? 0;
  const updateFields: Record<string, any> = {
    temperatura_ext: temperatura_externa ?? null,
    temperatura_piscina: temperatura_piscina ?? null,
    cloro_ppm: cloro_ppm ?? null,
    condicao_clima: condicao_clima ?? null,
  };
  if (sensacao !== undefined) updateFields.sensacao = sensacao;
  if (status_sugerido !== undefined) updateFields.status_sugerido = status_sugerido;
  if (motivo_sugerido !== undefined) updateFields.motivo_sugerido = motivo_sugerido;

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
      .update(updateFields)
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', aulaIdx);

    if (updateError) throw new AppError('Erro ao atualizar CardAula', 500);
  } else {
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('ativo', true);

    if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

    if (alunos && alunos.length > 0) {
      const novosLogs = alunos.map((a: any) => ({
        tenant_id: tenantId,
        data,
        grupo_id: a.id,
        indice_aula: aulaIdx,
        status: null,
        ...updateFields,
      }));

      const { error: insertError } = await supabase
        .from('chamadas_log')
        .upsert(novosLogs, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });

      if (insertError) throw new AppError('Erro ao inserir CardAula', 500);
    }
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: 'atualizacao',
    dados: { data, indice_aula: aulaIdx, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima },
  });
}

const CANCELAMENTO_TIPOS = new Set([
  'Falta Particular do Professor',
  'Falta Médica',
  'Manutenção Emergencial',
  'Raios e Trovões',
  'Incidente Crítico',
]);

async function aplicarBOEmIndice(
  tenantId: string,
  data: string,
  indice_aula: number,
  tipo_select: string,
  tipo_ocorrencia: string,
  motivo: string,
  grupo_id?: string,
): Promise<void> {
  const isCancelamento = CANCELAMENTO_TIPOS.has(tipo_ocorrencia);
  const statusFinal = tipo_select === 'pessoal' && grupo_id
    ? 'justificado'
    : isCancelamento
      ? 'cancelado'
      : undefined;

  if (grupo_id) {
    const { error } = await supabase
      .from('chamadas_log')
      .upsert({
        tenant_id: tenantId,
        data,
        grupo_id,
        indice_aula,
        tipo_select,
        tipo_ocorrencia,
        status: statusFinal || 'justificado',
        motivo,
        origem: 'manual',
      });
    if (error) throw new AppError('Erro ao salvar BO', 500);
  } else {
    const updateFields: Record<string, any> = {
      tipo_select,
      tipo_ocorrencia,
      motivo,
    };
    if (statusFinal) updateFields.status = statusFinal;

    const { error } = await supabase
      .from('chamadas_log')
      .update(updateFields)
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', indice_aula);
    if (error) throw new AppError('Erro ao atualizar BO', 500);
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
  compromete_dia?: boolean,
): Promise<void> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const aulaIdx = indice_aula ?? 0;
  const tSelect = tipo_select || 'pessoal';
  const tOcorrencia = tipo_ocorrencia || 'Outro';
  const tMotivo = motivo || '';

  if (compromete_dia) {
    const maxIndices = 12;
    for (let i = 0; i < maxIndices; i++) {
      await aplicarBOEmIndice(tenantId, data, i, tSelect, tOcorrencia, tMotivo, grupo_id);
    }
    if (tSelect === 'geral') {
      const { data: outros } = await supabase
        .from('chamadas_log')
        .select('grupo_id, indice_aula')
        .eq('tenant_id', tenantId)
        .eq('data', data);
      if (outros) {
        const visto = new Set<string>();
        for (const log of outros) {
          const key = `${log.grupo_id}|${log.indice_aula}`;
          if (visto.has(key)) continue;
          visto.add(key);
          await aplicarBOEmIndice(tenantId, data, log.indice_aula, tSelect, tOcorrencia, tMotivo, log.grupo_id);
        }
      }
    }
  } else {
    await aplicarBOEmIndice(tenantId, data, aulaIdx, tSelect, tOcorrencia, tMotivo, grupo_id);
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: tSelect === 'geral' && CANCELAMENTO_TIPOS.has(tOcorrencia) ? 'cancelamento' : 'insercao',
    dados: { data, indice_aula: aulaIdx, tipo_select: tSelect, tipo_ocorrencia: tOcorrencia, compromete_dia },
  });
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
    .select('condicao_clima, temperatura_ext, temperatura_piscina, cloro_ppm, sensacao, status_sugerido, motivo_sugerido')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula)
    .not('condicao_clima', 'is', null)
    .limit(1);

  if (error) throw new AppError('Erro ao buscar CardAula', 500);

  return registros && registros.length > 0 ? registros[0] : null;
}

const condicoes: Record<number, string> = {
  0: 'c\u00e9u limpo', 1: 'principalmente limpo',
  2: 'parcialmente nublado', 3: 'nublado',
  45: 'n\u00e9voa seca', 48: 'nevoeiro/geadas',
  51: 'chuvisco', 53: 'chuvisco', 55: 'chuvisco',
  56: 'chuvisco congelante', 57: 'chuvisco congelante',
  61: 'chuva', 63: 'chuva', 65: 'chuva',
  66: 'chuva congelante', 67: 'chuva congelante',
  71: 'neve', 73: 'neve', 75: 'neve',
  77: 'gr\u00e3os de neve',
  80: 'pancadas de chuva', 81: 'pancadas de chuva', 82: 'pancadas de chuva',
  85: 'pancadas de neve', 86: 'pancadas de neve',
  95: 'tempestade', 96: 'tempestade com granizo', 99: 'tempestade com granizo',
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
