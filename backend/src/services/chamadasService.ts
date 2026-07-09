import { supabase } from './supabaseClient';
import { ChamadaLog } from '../types';
import { AppError } from '../middleware/errorHandler';
import { fetchWeather } from '../utils/weather';
import { registrarOperacao } from '../utils/logEngine';
import * as extrapolarService from './extrapolarService';

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
    .order('indice_aula', { ascending: true })
    .range(0, 1000000);

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

  if (!alunos || alunos.length === 0) {
    return { message: 'Nenhum aluno ativo para aplicar evento', count: 0 };
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: 'calendario',
    dados: { data, tipo, total: alunos.length },
  });

  return { message: `Evento ${tipo} aplicado para ${alunos.length} alunos (frontend-only)`, count: alunos.length };
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

function buildCardAulaFields(
  temperatura_externa?: number,
  temperatura_piscina?: number,
  cloro_ppm?: number,
  condicao_clima?: string,
  sensacao?: string[],
  status_sugerido?: string,
  motivo_sugerido?: string,
): Record<string, any> {
  const fields: Record<string, any> = {
    temperatura_ext: temperatura_externa ?? null,
    temperatura_piscina: temperatura_piscina ?? null,
    cloro_ppm: cloro_ppm ?? null,
    condicao_clima: condicao_clima ?? null,
  };
  if (sensacao !== undefined) fields.sensacao = sensacao;
  if (status_sugerido !== undefined) fields.status_sugerido = status_sugerido;
  if (motivo_sugerido !== undefined) fields.motivo_sugerido = motivo_sugerido;
  return fields;
}

function columError(err: any): boolean {
  const msg = err?.message || '';
  return msg.includes('column') || msg.includes('Column') || msg.includes('does not exist') || msg.includes('não existe');
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
  let updateFields = buildCardAulaFields(temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima, sensacao, status_sugerido, motivo_sugerido);

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

    if (updateError) {
      if (columError(updateError)) {
        console.warn('[salvarCardAula] coluna nao existe no update, salvando apenas basico:', updateError.message);
        const { error: retryError } = await supabase
          .from('chamadas_log')
          .update({})
          .eq('tenant_id', tenantId)
          .eq('data', data)
          .eq('indice_aula', aulaIdx);
        if (retryError) console.error('[salvarCardAula] erro mesmo no update basico:', retryError.message);
      } else {
        throw new AppError('Erro ao atualizar CardAula', 500);
      }
    }
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

      if (insertError) {
        if (columError(insertError)) {
          console.warn('[salvarCardAula] coluna nao existe no insert, inserindo apenas basico:', insertError.message);
          const basico = alunos.map((a: any) => ({
            tenant_id: tenantId, data, grupo_id: a.id, indice_aula: aulaIdx, status: null,
          }));
          const { error: retryError } = await supabase
            .from('chamadas_log')
            .upsert(basico, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });
          if (retryError) console.error('[salvarCardAula] erro mesmo no insert basico:', retryError.message);
        } else {
          throw new AppError('Erro ao inserir CardAula', 500);
        }
      }
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
  'Médico pessoal',
  'Médico trabalho',
  'Particular',
  'Reunião',
  'Secretaria',
]);

async function salvarMetadadosBO(
  tenantId: string,
  data: string,
  indice_aula: number,
  tipo_ocorrencia: string,
  motivo: string,
): Promise<void> {
  const { data: existente } = await supabase
    .from('chamadas_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula)
    .limit(1);

  if (existente && existente.length > 0) {
    const { error } = await supabase
      .from('chamadas_log')
      .update({ tipo_ocorrencia, motivo })
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .eq('indice_aula', indice_aula);
    if (error) throw new AppError('Erro ao salvar metadados BO', 500);
  } else {
    const { error } = await supabase
      .from('chamadas_log')
      .insert({
        tenant_id: tenantId,
        data,
        indice_aula,
        tipo_ocorrencia,
        motivo,
        origem: 'manual',
        status: null,
      });
    if (error) throw new AppError('Erro ao salvar metadados BO', 500);
  }
}

export async function salvarCardBO(
  tenantId: string,
  data: string,
  indice_aula: number | undefined,
  via: 'via_1' | 'via_2',
  tipo_ocorrencia: string,
  motivo: string,
  compromete_dia?: boolean,
  professorId?: string,
  grupoId?: string,
): Promise<void> {
  if (!data) throw new AppError('Campo data e obrigatorio', 400);

  const aulaIdx = indice_aula ?? 0;
  const tMotivo = motivo || '';
  const isCancelamento = CANCELAMENTO_TIPOS.has(tipo_ocorrencia);

  if (!isCancelamento || !grupoId) {
    await salvarMetadadosBO(tenantId, data, aulaIdx, tipo_ocorrencia, tMotivo);
    registrarOperacao({
      tenant_id: tenantId,
      tabela: 'chamadas_log',
      operacao: 'insercao',
      dados: { data, indice_aula: aulaIdx, tipo_ocorrencia, via, compromete_dia },
    });
    return;
  }

  if (via === 'via_2') {
    if (!professorId) throw new AppError('Professor ID obrigatorio para via_2', 400);
    await extrapolarService.extrapolarCancelamentoPessoal(tenantId, data, grupoId, aulaIdx, !!compromete_dia, professorId, tMotivo, tipo_ocorrencia, 'pessoal');
  } else {
    await extrapolarService.extrapolarCancelamentoGeral(tenantId, data, grupoId, aulaIdx, !!compromete_dia, tMotivo, tipo_ocorrencia, 'geral');
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: 'cancelamento',
    dados: { data, indice_aula: aulaIdx, tipo_ocorrencia, via, compromete_dia },
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
  // Tenta com todas as colunas, se falhar (coluna nao existe) retorna null
  const fullQuery = 'condicao_clima, temperatura_ext, temperatura_piscina, cloro_ppm, sensacao, status_sugerido, motivo_sugerido';
  const { data: registros, error } = await supabase
    .from('chamadas_log')
    .select(fullQuery)
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .eq('indice_aula', indice_aula)
    .not('condicao_clima', 'is', null)
    .limit(1);

  if (error) {
    if (columError(error)) {
      console.warn('[obterCardAula] coluna nao existe, retornando null:', error.message);
      return null;
    }
    throw new AppError('Erro ao buscar CardAula', 500);
  }

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
