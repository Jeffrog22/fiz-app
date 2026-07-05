import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { registrarOperacao } from '../utils/logEngine';

async function extrapolarPorLabel(
  tenantId: string,
  data: string,
  grupoId: string,
  indiceAulaOrigem: number,
  status: 'justificado' | 'cancelado',
  motivo?: string,
  apenasSubsequentesOrigem?: boolean,
): Promise<{ message: string; count: number }> {
  if (!data) throw new AppError('Campo data é obrigatório', 400);

  const { data: sourceTurma, error: srcError } = await supabase
    .from('turmas')
    .select('label, professor_id')
    .eq('grupo_id', grupoId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (srcError) {
    console.error('[extrapolarPorLabel] Erro ao buscar turma origem:', srcError.message);
    throw new AppError('Erro ao buscar turma de origem', 500);
  }
  if (!sourceTurma) {
    return { message: `Turma ${grupoId} não encontrada`, count: 0 };
  }

  const { data: allTurmas, error: turmasError } = await supabase
    .from('turmas')
    .select('grupo_id, professor_id, horario')
    .eq('tenant_id', tenantId)
    .eq('label', sourceTurma.label)
    .order('professor_id')
    .order('horario');

  if (turmasError) {
    console.error('[extrapolarPorLabel] Erro ao buscar turmas do label:', turmasError.message);
    throw new AppError('Erro ao buscar turmas do mesmo label', 500);
  }

  if (!allTurmas || allTurmas.length === 0) {
    return { message: `Nenhuma turma encontrada para o label ${sourceTurma.label}`, count: 0 };
  }

  const profGroups = new Map<string, string[]>();
  for (const t of allTurmas) {
    const prof = t.professor_id || 'sem_professor';
    if (!profGroups.has(prof)) profGroups.set(prof, []);
    profGroups.get(prof)!.push(t.grupo_id);
  }

  const logsCriados: any[] = [];

  for (const [profId, grupoIds] of profGroups) {
    const maxIndices = grupoIds.length;

    let indicesAProcessar: number[];
    if (apenasSubsequentesOrigem && profId === (sourceTurma.professor_id || 'sem_professor')) {
      indicesAProcessar = [];
      for (let i = indiceAulaOrigem + 1; i < maxIndices; i++) indicesAProcessar.push(i);
    } else {
      indicesAProcessar = [];
      for (let i = 0; i < maxIndices; i++) indicesAProcessar.push(i);
    }

    if (indicesAProcessar.length === 0) continue;

    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('turma_id', grupoIds)
      .eq('ativo', true);

    if (alunosError) {
      console.error('[extrapolarPorLabel] Erro ao buscar alunos:', alunosError.message);
      continue;
    }

    const alunoIds = (alunos || []).map((a: any) => a.id);
    if (alunoIds.length === 0) continue;

    const { data: existingLogs, error: fetchError } = await supabase
      .from('chamadas_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('data', data)
      .in('grupo_id', alunoIds);

    if (fetchError) {
      console.error('[extrapolarPorLabel] Erro ao buscar logs:', fetchError.message);
      continue;
    }

    const existingMap = new Map<string, any>();
    for (const log of existingLogs || []) {
      existingMap.set(`${log.grupo_id}_${log.indice_aula}`, log);
    }

    for (const idx of indicesAProcessar) {
      for (const alunoId of alunoIds) {
        const key = `${alunoId}_${idx}`;
        const existing = existingMap.get(key);

        if (existing) {
          if (existing.origem === 'manual' || existing.origem === 'calendario') continue;
          if (existing.status === 'cancelado') continue;
        }

        logsCriados.push({
          tenant_id: tenantId,
          data,
          grupo_id: alunoId,
          indice_aula: idx,
          status,
          motivo: motivo || existing?.motivo || null,
          origem: 'extrapolado',
        });
      }
    }
  }

  if (logsCriados.length === 0) {
    return { message: 'Nenhum índice precisou de extrapolação', count: 0 };
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < logsCriados.length; i += BATCH_SIZE) {
    const batch = logsCriados.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('chamadas_log')
      .upsert(batch, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });

    if (insertError) {
      console.error('[extrapolarPorLabel] Erro ao inserir batch:', insertError.message, 'idx:', i);
      for (const log of batch) {
        const { error: singleError } = await supabase
          .from('chamadas_log')
          .upsert(log, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });
        if (singleError) {
          console.error('[extrapolarPorLabel] Erro ao inserir individual:', singleError.message);
        }
      }
    }
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: `extrapolacao_${status}`,
    dados: { data, label: sourceTurma.label, total: logsCriados.length, motivo },
  });

  const label = status === 'cancelado' ? 'Cancelamento' : 'Justificativa';
  return { message: `${label} extrapolado para ${logsCriados.length} registros em ${sourceTurma.label}`, count: logsCriados.length };
}

export async function extrapolarJustificativa(
  tenantId: string,
  data: string,
  grupoId: string,
  indiceAulaOrigem: number,
  _maxIndices?: number,
  motivo?: string,
): Promise<{ message: string; count: number }> {
  return extrapolarPorLabel(tenantId, data, grupoId, indiceAulaOrigem, 'justificado', motivo, true);
}

export async function extrapolarCancelamento(
  tenantId: string,
  data: string,
  grupoId: string,
  indiceAulaOrigem: number,
  _maxIndices?: number,
  motivo?: string,
): Promise<{ message: string; count: number }> {
  return extrapolarPorLabel(tenantId, data, grupoId, indiceAulaOrigem, 'cancelado', motivo, false);
}
