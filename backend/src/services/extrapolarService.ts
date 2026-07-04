import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { registrarOperacao } from '../utils/logEngine';

/**
 * Extrapola status 'justificado' para todos os índices subsequentes de uma data.
 *
 * Regras:
 * - Não sobrescreve registros com origem = 'manual' ou 'calendario'
 * - Não sobrescreve registros com status = 'cancelado' (precedência máxima)
 * - Cria/atualiza registros com status = 'justificado', origem = 'extrapolado_justificativa'
 * - Continua a partir de indice_aula + 1 até o próximo índice onde exista registro manual
 *
 * @returns quantidade de logs criados/atualizados
 */
export async function extrapolarJustificativa(
  tenantId: string,
  data: string,
  grupoId: string,
  indiceAulaOrigem: number,
  maxIndices: number = 12,
  motivo?: string,
): Promise<{ message: string; count: number }> {
  if (!data) throw new AppError('Campo data é obrigatório', 400);

  const indicesAProcessar: number[] = [];

  // Coleta índices subsequentes que precisam de extrapolação
  for (let i = indiceAulaOrigem + 1; i < maxIndices; i++) {
    indicesAProcessar.push(i);
  }

  if (indicesAProcessar.length === 0) {
    return { message: 'Nenhum índice subsequente para extrapolar', count: 0 };
  }

  // Busca alunos ativos da turma (grupo_id é turma.grupo_id)
  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('turma_id', grupoId)
    .eq('ativo', true);

  if (alunosError) {
    console.error('[extrapolarJustificativa] Erro ao buscar alunos:', alunosError.message);
    throw new AppError('Erro ao buscar alunos', 500);
  }

  const alunoIds = (alunos || []).map((a: any) => a.id);

  if (alunoIds.length === 0) {
    return { message: 'Nenhum aluno ativo para extrapolar justificativa', count: 0 };
  }

  // Busca registros existentes para esta data + alunos
  const { data: existingLogs, error: fetchError } = await supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('data', data)
    .in('grupo_id', alunoIds);

  if (fetchError) {
    console.error('[extrapolarJustificativa] Erro ao buscar logs:', fetchError.message);
    throw new AppError('Erro ao verificar chamadas existentes', 500);
  }

  // Indexa registros existentes por `${grupo_id}_${indice_aula}`
  const existingMap = new Map<string, any>();
  for (const log of existingLogs || []) {
    existingMap.set(`${log.grupo_id}_${log.indice_aula}`, log);
  }

  const logsCriados: any[] = [];

  // Para cada índice subsequente, aplica 'J' para cada aluno, respeitando precedência
  for (const idx of indicesAProcessar) {
    for (const alunoId of alunoIds) {
      const key = `${alunoId}_${idx}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Não sobrescrever se for manual ou calendario (prioridade máxima)
        if (existing.origem === 'manual' || existing.origem === 'calendario') {
          continue;
        }
        // Não sobrescrever cancelado
        if (existing.status === 'cancelado') {
          continue;
        }
      }

      logsCriados.push({
        tenant_id: tenantId,
        data,
        grupo_id: alunoId,
        indice_aula: idx,
        status: 'justificado',
        motivo: motivo || existing?.motivo || null,
        origem: 'extrapolado',
      });
    }
  }

  if (logsCriados.length === 0) {
    return { message: 'Nenhum índice precisou de extrapolação (todos já manuais)', count: 0 };
  }

  // Insere em batches de 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < logsCriados.length; i += BATCH_SIZE) {
    const batch = logsCriados.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from('chamadas_log')
      .upsert(batch, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });

    if (insertError) {
      console.error('[extrapolarJustificativa] Erro ao inserir batch:', insertError.message, 'idx:', i);
      for (const log of batch) {
        const { error: singleError } = await supabase
          .from('chamadas_log')
          .upsert(log, { onConflict: 'tenant_id,data,grupo_id,indice_aula' });
        if (singleError) {
          console.error('[extrapolarJustificativa] Erro ao inserir individual:', singleError.message);
        }
      }
    }
  }

  registrarOperacao({
    tenant_id: tenantId,
    tabela: 'chamadas_log',
    operacao: 'extrapolacao_justificativa',
    dados: { data, indice_aula_origem: indiceAulaOrigem, total: logsCriados.length, motivo },
  });

  return { message: `Justificativa extrapolada para ${logsCriados.length} registros`, count: logsCriados.length };
}