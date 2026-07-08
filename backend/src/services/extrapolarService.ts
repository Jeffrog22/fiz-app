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
  professorIdFilter?: string,
  apenasIndiceUnico?: boolean,
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
    .select('grupo_id, professor_id, horario, faixa_etaria, nivel')
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

  const faixaEtariaMap = new Map<string, string>();
  const nivelMap = new Map<string, string>();
  for (const t of allTurmas) {
    faixaEtariaMap.set(t.grupo_id, t.faixa_etaria || '');
    nivelMap.set(t.grupo_id, t.nivel || '');
  }

  const motivoIniciacao = motivo === 'Água fria para iniciação';
  const motivoMenores = motivo === 'Água muito fria para menores';
  const motivoMaiores16 = motivo === 'Água fria para maiores de 16';
  const motivoMuitoFria = motivo === 'Água muito fria';
  const motivoFria = motivo === 'Água fria';

  const profGroups = new Map<string, { grupo_id: string; horario: string; faixa_etaria: string; nivel: string }[]>();
  for (const t of allTurmas) {
    const prof = t.professor_id || 'sem_professor';
    if (professorIdFilter && prof !== professorIdFilter) continue;
    if (!profGroups.has(prof)) profGroups.set(prof, []);
    profGroups.get(prof)!.push({
      grupo_id: t.grupo_id,
      horario: t.horario,
      faixa_etaria: faixaEtariaMap.get(t.grupo_id) || '',
      nivel: nivelMap.get(t.grupo_id) || '',
    });
  }

  const logsCriados: any[] = [];

  for (const [profId, turmas] of profGroups) {
    const maxIndices = turmas.length;

    let indicesAProcessar: number[];
    if (apenasIndiceUnico) {
      indicesAProcessar = [indiceAulaOrigem];
    } else if (apenasSubsequentesOrigem && profId === (sourceTurma.professor_id || 'sem_professor')) {
      indicesAProcessar = [];
      for (let i = indiceAulaOrigem; i < maxIndices; i++) indicesAProcessar.push(i);
    } else {
      indicesAProcessar = [];
      for (let i = 0; i < maxIndices; i++) indicesAProcessar.push(i);
    }

    if (indicesAProcessar.length === 0) continue;

    for (const idx of indicesAProcessar) {
      if (idx >= maxIndices) continue;
      const turma = turmas[idx];
      const faixa = turma.faixa_etaria || '';
      const nivel = turma.nivel.toUpperCase();
      if (motivoMenores && (faixa === '+ 16 anos' || faixa === '+16 anos')) continue;
      if (motivoMaiores16 && faixa !== '+ 16 anos' && faixa !== '+16 anos') continue;
      if (motivoIniciacao && !nivel.startsWith('INICIAÇÃO')) continue;
      if ((motivoMuitoFria || motivoFria) && nivel.startsWith('INICIAÇÃO')) continue;
      logsCriados.push({
        tenant_id: tenantId,
        data,
        grupo_id: turma.grupo_id,
        indice_aula: idx,
        status,
        motivo: motivo || null,
        origem: 'extrapolado',
      });
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

  for (const log of logsCriados) {
    const { data: alunos } = await supabase
      .from('alunos')
      .select('id')
      .eq('turma_id', log.grupo_id)
      .eq('tenant_id', tenantId)
      .eq('ativo', true);

    if (alunos && alunos.length > 0) {
      const studentLogs = alunos.map((a: any) => ({
        tenant_id: tenantId,
        data,
        grupo_id: a.id,
        indice_aula: log.indice_aula,
        status: log.status,
        motivo: log.motivo || null,
        origem: 'extrapolado',
      }));
      for (let j = 0; j < studentLogs.length; j += BATCH_SIZE) {
        const batch = studentLogs.slice(j, j + BATCH_SIZE);
        const { error: studentError } = await supabase
          .from('chamadas_log')
          .upsert(batch, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });
        if (studentError) {
          console.error('[extrapolarPorLabel] Erro student-level batch:', studentError.message);
          for (const sl of batch) {
            const { error: se } = await supabase.from('chamadas_log').upsert(sl, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });
            if (se) console.error('[extrapolarPorLabel] Erro student-level individual:', se.message);
          }
        }
      }
    }
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: `extrapolacao_${status}`,
    dados: { data, label: sourceTurma.label, total: logsCriados.length, motivo, professorIdFilter, apenasIndiceUnico },
  });

  const label = status === 'cancelado' ? 'Cancelamento' : 'Justificativa';
  return { message: `${label} extrapolado para ${logsCriados.length} turmas em ${sourceTurma.label}`, count: logsCriados.length };
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

export async function extrapolarCancelamentoPessoal(
  tenantId: string,
  data: string,
  grupoId: string,
  indiceAula: number,
  comprometeDia: boolean,
  professorId: string,
  motivo?: string,
): Promise<{ message: string; count: number }> {
  return extrapolarPorLabel(tenantId, data, grupoId, indiceAula, 'cancelado', motivo, false, professorId, !comprometeDia);
}

export async function extrapolarCancelamentoGeral(
  tenantId: string,
  data: string,
  grupoId: string,
  indiceAula: number,
  comprometeDia: boolean,
  motivo?: string,
): Promise<{ message: string; count: number }> {
  return extrapolarPorLabel(tenantId, data, grupoId, indiceAula, 'cancelado', motivo, false, undefined, !comprometeDia);
}
