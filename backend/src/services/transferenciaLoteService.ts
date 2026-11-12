import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import type {
  TransferenciaLote,
  TransferenciaLoteItem,
  TransferenciaLoteCreateInput,
  TransferenciaLoteUpdateInput,
  StatusTransferenciaLote,
  StatusTransferenciaLoteItem,
} from '../types';

const LOTE_TABLE = 'transferencia_lote';
const ITEM_TABLE = 'transferencia_lote_item';

const STATUS_ATIVOS: string[] = ['programado', 'revisao'];

export async function criarLote(
  tenantId: string,
  professorId: string,
  input: TransferenciaLoteCreateInput,
): Promise<TransferenciaLote> {
  // Valida destino: turma deve existir na tenant
  const { data: turmaDestino, error: turmaError } = await supabase
    .from('turmas')
    .select('grupo_id, nivel, professor_id, label, horario, capacidade')
    .eq('tenant_id', tenantId)
    .eq('grupo_id', input.turma_destino)
    .maybeSingle();

  if (turmaError) throw new AppError('Erro ao validar turma destino', 500);
  if (!turmaDestino) throw new AppError('Turma destino nao encontrada nesta unidade', 404);

  // Valida data efetiva
  const dataEfetiva = new Date(input.data_efetiva);
  if (isNaN(dataEfetiva.getTime())) throw new AppError('Data efetiva invalida', 400);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (dataEfetiva < hoje) throw new AppError('Data efetiva nao pode ser no passado', 400);

  // Valida alunos e origens
  const alunoIds = [...new Set(input.itens.map((i) => i.aluno_id).filter(Boolean))];
  if (alunoIds.length === 0) throw new AppError('Informe pelo menos um aluno', 400);

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id, turma_id, nivel, tenant_id')
    .in('id', alunoIds)
    .eq('tenant_id', tenantId);

  if (alunosError) throw new AppError('Erro ao validar alunos', 500);
  if (!alunos || alunos.length !== alunoIds.length) {
    throw new AppError('Um ou mais alunos nao encontrados nesta unidade', 404);
  }

  const alunoMap = new Map(alunos.map((a) => [a.id, a]));

  // Verifica duplicidade: aluno ja tem lote ativo (programado/revisao) com data efetiva sobreposta
  const lotesAtivos = await supabase
    .from(ITEM_TABLE)
    .select('aluno_id, lote_id, status')
    .in('aluno_id', alunoIds)
    .eq('tenant_id', tenantId);

  if (lotesAtivos.error) throw new AppError('Erro ao verificar lotes existentes', 500);

  const lotesIds = [...new Set((lotesAtivos.data || []).map((i) => i.lote_id).filter(Boolean))];
  if (lotesIds.length > 0) {
    const lotesDetalhe = await supabase
      .from(LOTE_TABLE)
      .select('id, data_efetiva, status')
      .in('id', lotesIds)
      .in('status', STATUS_ATIVOS);

    if (lotesDetalhe.error) throw new AppError('Erro ao verificar lotes existentes', 500);

    const lotesSobrepostos = new Set<string>();
    for (const lote of lotesDetalhe.data || []) {
      if (lote.data_efetiva === input.data_efetiva) {
        for (const item of lotesAtivos.data || []) {
          if (item.lote_id === lote.id) lotesSobrepostos.add(item.aluno_id);
        }
      }
    }

    if (lotesSobrepostos.size > 0) {
      throw new AppError('Um ou mais alunos ja possuem transferencia programada para esta data', 409);
    }
  }

  // Monta itens com origem atual
  const itens = input.itens.map((itemInput) => {
    const aluno = alunoMap.get(itemInput.aluno_id);
    if (!aluno) throw new AppError('Aluno nao encontrado', 404);
    return {
      aluno_id: itemInput.aluno_id,
      turma_origem: aluno.turma_id || '',
      nivel_origem: aluno.nivel || null,
      turma_destino: itemInput.turma_destino || input.turma_destino,
      nivel_destino: itemInput.turma_destino
        ? turmaDestino.nivel || null
        : input.nivel_destino || turmaDestino.nivel || null,
      professor_destino: input.professor_destino || turmaDestino.professor_id || null,
      status: 'pendente' as const,
    };
  });

  // Insere o lote
  const { data: lote, error: loteError } = await supabase
    .from(LOTE_TABLE)
    .insert({
      tenant_id: tenantId,
      professor_id: professorId,
      turma_destino: input.turma_destino,
      nivel_destino: input.nivel_destino || turmaDestino.nivel || null,
      professor_destino: input.professor_destino || turmaDestino.professor_id || null,
      data_efetiva: input.data_efetiva,
      status: 'programado',
      motivo: input.motivo || null,
    })
    .select()
    .single();

  if (loteError || !lote) throw new AppError('Erro ao criar lote de transferencia', 500);

  // Insere os itens
  const itensInsert = itens.map((i) => ({
    ...i,
    lote_id: lote.id,
    tenant_id: tenantId,
  }));

  const { error: itensError } = await supabase
    .from(ITEM_TABLE)
    .insert(itensInsert);

  if (itensError) {
    // Compensacao: remove o lote criado
    await supabase.from(LOTE_TABLE).delete().eq('id', lote.id);
    throw new AppError('Erro ao criar itens do lote', 500);
  }

  return {
    id: lote.id,
    tenant_id: lote.tenant_id,
    professor_id: lote.professor_id,
    turma_destino: lote.turma_destino,
    nivel_destino: lote.nivel_destino ?? undefined,
    professor_destino: lote.professor_destino ?? undefined,
    data_efetiva: lote.data_efetiva,
    status: lote.status as 'programado',
    motivo: lote.motivo ?? undefined,
    criado_em: lote.created_at || lote.criado_em,
    atualizado_em: lote.updated_at || lote.atualizado_em,
    confirmado_em: lote.confirmado_em ?? undefined,
    confirmado_por: lote.confirmado_por ?? undefined,
  };
}

export async function listarLotes(
  tenantId: string,
  status?: string,
): Promise<Array<TransferenciaLote & { totalItens: number; itensAplicados: number; itensPendentes: number }>> {
  let query = supabase
    .from(LOTE_TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) throw new AppError('Erro ao listar lotes', 500);
  if (!data) return [];

  const loteIds = data.map((l) => l.id);

  let contagem: Record<string, { total: number; aplicados: number; pendentes: number }> = {};
  if (loteIds.length > 0) {
    const { data: itens, error: itensError } = await supabase
      .from(ITEM_TABLE)
      .select('lote_id, status')
      .in('lote_id', loteIds);

    if (itensError) throw new AppError('Erro ao carregar itens dos lotes', 500);

    for (const item of itens || []) {
      if (!contagem[item.lote_id]) contagem[item.lote_id] = { total: 0, aplicados: 0, pendentes: 0 };
      contagem[item.lote_id].total += 1;
      if (item.status === 'aplicado') contagem[item.lote_id].aplicados += 1;
      else if (item.status === 'pendente') contagem[item.lote_id].pendentes += 1;
    }
  }

  return data.map((l) => {
    const c = contagem[l.id] || { total: 0, aplicados: 0, pendentes: 0 };
    return {
      id: l.id,
      tenant_id: l.tenant_id,
      professor_id: l.professor_id,
      turma_destino: l.turma_destino,
      nivel_destino: l.nivel_destino ?? undefined,
      professor_destino: l.professor_destino ?? undefined,
      data_efetiva: l.data_efetiva,
      status: l.status as StatusTransferenciaLote,
      motivo: l.motivo ?? undefined,
      criado_em: l.created_at || l.criado_em,
      atualizado_em: l.updated_at || l.atualizado_em,
      confirmado_em: l.confirmado_em ?? undefined,
      confirmado_por: l.confirmado_por ?? undefined,
      totalItens: c.total,
      itensAplicados: c.aplicados,
      itensPendentes: c.pendentes,
    };
  });
}

export async function buscarLote(
  loteId: string,
  tenantId: string,
): Promise<{ lote: TransferenciaLote; itens: TransferenciaLoteItem[] } | null> {
  const { data: lote, error: loteError } = await supabase
    .from(LOTE_TABLE)
    .select('*')
    .eq('id', loteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (loteError) throw new AppError('Erro ao buscar lote', 500);
  if (!lote) return null;

  const { data: itens, error: itensError } = await supabase
    .from(ITEM_TABLE)
    .select('*')
    .eq('lote_id', loteId)
    .order('criado_em', { ascending: true });

  if (itensError) throw new AppError('Erro ao buscar itens do lote', 500);

  // Busca nomes dos alunos
  const alunoIds = (itens || []).map((i) => i.aluno_id).filter(Boolean);
  let alunoNomes: Record<string, string> = {};
  if (alunoIds.length > 0) {
    const { data: alunos } = await supabase
      .from('alunos')
      .select('id, nome')
      .in('id', alunoIds);
    if (alunos) {
      alunoNomes = Object.fromEntries(alunos.map((a) => [a.id, a.nome]));
    }
  }

  return {
    lote: {
      id: lote.id,
      tenant_id: lote.tenant_id,
      professor_id: lote.professor_id,
      turma_destino: lote.turma_destino,
      nivel_destino: lote.nivel_destino ?? undefined,
      professor_destino: lote.professor_destino ?? undefined,
      data_efetiva: lote.data_efetiva,
      status: lote.status as StatusTransferenciaLote,
      motivo: lote.motivo ?? undefined,
      criado_em: lote.created_at || lote.criado_em,
      atualizado_em: lote.updated_at || lote.atualizado_em,
      confirmado_em: lote.confirmado_em ?? undefined,
      confirmado_por: lote.confirmado_por ?? undefined,
    },
    itens: (itens || []).map((i) => ({
      id: i.id,
      lote_id: i.lote_id,
      tenant_id: i.tenant_id,
      aluno_id: i.aluno_id,
      aluno_nome: alunoNomes[i.aluno_id] || undefined,
      turma_origem: i.turma_origem,
      nivel_origem: i.nivel_origem ?? undefined,
      turma_destino: i.turma_destino,
      nivel_destino: i.nivel_destino ?? undefined,
      professor_destino: i.professor_destino ?? undefined,
      status: i.status as StatusTransferenciaLoteItem,
      erro_mensagem: i.erro_mensagem ?? undefined,
      criado_em: i.created_at || i.criado_em,
    })),
  };
}

export async function atualizarLote(
  loteId: string,
  tenantId: string,
  professorId: string,
  input: TransferenciaLoteUpdateInput,
): Promise<TransferenciaLote> {
  const { data: lote, error: loteError } = await supabase
    .from(LOTE_TABLE)
    .select('status, turma_destino')
    .eq('id', loteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (loteError) throw new AppError('Erro ao buscar lote', 500);
  if (!lote) throw new AppError('Lote nao encontrado', 404);
  if (!STATUS_ATIVOS.includes(lote.status as string)) {
    throw new AppError('Só é possível editar lotes programados ou em revisao', 400);
  }

  // Se mudou o destino, valida a nova turma
  if (input.turma_destino && input.turma_destino !== lote.turma_destino) {
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('nivel, professor_id')
      .eq('tenant_id', tenantId)
      .eq('grupo_id', input.turma_destino)
      .maybeSingle();

    if (turmaError) throw new AppError('Erro ao validar nova turma destino', 500);
    if (!turma) throw new AppError('Nova turma destino nao encontrada nesta unidade', 404);

    // Atualiza nivel_destino e professor_destino se nao fornecidos explicitamente
    if (input.nivel_destino === undefined) input.nivel_destino = turma.nivel || null;
    if (input.professor_destino === undefined) input.professor_destino = turma.professor_id || null;
  }

  const updateData: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (input.turma_destino !== undefined) updateData.turma_destino = input.turma_destino;
  if (input.nivel_destino !== undefined) updateData.nivel_destino = input.nivel_destino;
  if (input.professor_destino !== undefined) updateData.professor_destino = input.professor_destino;
  if (input.data_efetiva !== undefined) updateData.data_efetiva = input.data_efetiva;
  if (input.motivo !== undefined) updateData.motivo = input.motivo;

  const { data, error } = await supabase
    .from(LOTE_TABLE)
    .update(updateData)
    .eq('id', loteId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error || !data) throw new AppError('Erro ao atualizar lote', 500);

  // Se mudou destino ou data, atualiza os itens pendentes
  if ((input.turma_destino || input.data_efetiva) && data.id) {
    const itemUpdate: Record<string, unknown> = {};
    if (input.turma_destino !== undefined) itemUpdate.turma_destino = input.turma_destino;
    if (input.nivel_destino !== undefined) itemUpdate.nivel_destino = input.nivel_destino;
    if (input.professor_destino !== undefined) itemUpdate.professor_destino = input.professor_destino;

    if (Object.keys(itemUpdate).length > 0) {
      await supabase
        .from(ITEM_TABLE)
        .update(itemUpdate)
        .eq('lote_id', loteId)
        .eq('status', 'pendente');
    }
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    professor_id: data.professor_id,
    turma_destino: data.turma_destino,
    nivel_destino: data.nivel_destino ?? undefined,
    professor_destino: data.professor_destino ?? undefined,
    data_efetiva: data.data_efetiva,
    status: data.status as StatusTransferenciaLote,
    motivo: data.motivo ?? undefined,
    criado_em: data.created_at || data.criado_em,
    atualizado_em: data.updated_at || data.atualizado_em,
    confirmado_em: data.confirmado_em ?? undefined,
    confirmado_por: data.confirmado_por ?? undefined,
  };
}

export async function removerItemLote(
  loteId: string,
  alunoId: string,
  tenantId: string,
): Promise<void> {
  const { data: lote, error: loteError } = await supabase
    .from(LOTE_TABLE)
    .select('status')
    .eq('id', loteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (loteError) throw new AppError('Erro ao buscar lote', 500);
  if (!lote) throw new AppError('Lote nao encontrado', 404);
  if (!STATUS_ATIVOS.includes(lote.status as string)) {
    throw new AppError('Só é possível modificar lotes programados ou em revisao', 400);
  }

  const { error } = await supabase
    .from(ITEM_TABLE)
    .delete()
    .eq('lote_id', loteId)
    .eq('aluno_id', alunoId)
    .eq('status', 'pendente');

  if (error) throw new AppError('Erro ao retirar item do lote', 500);
}

export async function cancelarLote(
  loteId: string,
  tenantId: string,
  professorId: string,
): Promise<void> {
  const { data: lote, error: loteError } = await supabase
    .from(LOTE_TABLE)
    .select('status')
    .eq('id', loteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (loteError) throw new AppError('Erro ao buscar lote', 500);
  if (!lote) throw new AppError('Lote nao encontrado', 404);
  if (!STATUS_ATIVOS.includes(lote.status as string)) {
    throw new AppError('Só é possível cancelar lotes programados ou em revisao', 400);
  }

  const { error } = await supabase
    .from(LOTE_TABLE)
    .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
    .eq('id', loteId)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError('Erro ao cancelar lote', 500);
}

export async function aplicarLote(
  loteId: string,
  tenantId: string,
  professorId: string,
): Promise<{ aplicados: number; erros: number; conflitos: number; detalhes: Array<{ item_id: string; aluno_id: string; status: string; erro_mensagem?: string }> }> {
  // Verifica se o lote existe e esta disponível
  const { data: lote, error: loteError } = await supabase
    .from(LOTE_TABLE)
    .select('status')
    .eq('id', loteId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (loteError) throw new AppError('Erro ao buscar lote', 500);
  if (!lote) throw new AppError('Lote nao encontrado', 404);
  if (!STATUS_ATIVOS.includes(lote.status as string)) {
    throw new AppError('Lote ja foi aplicado, cancelado ou esta em processo', 400);
  }

  // Chama a funcao RPC atomica no banco
  const { data, error } = await supabase.rpc('aplicar_transferencia_lote', {
    p_lote_id: loteId,
    p_confirmado_por: professorId,
  });

  if (error) {
    throw new AppError(error.message || 'Erro ao aplicar lote de transferencia', 400);
  }

  const detalhes = (data as any[] || []).map((d: any) => ({
    item_id: d.item_id,
    aluno_id: d.aluno_id,
    status: d.status,
    erro_mensagem: d.erro_mensagem ?? undefined,
  }));

  const aplicados = detalhes.filter((d) => d.status === 'aplicado').length;
  const erros = detalhes.filter((d) => d.status === 'erro').length;
  const conflitos = detalhes.filter((d) => d.status === 'conflito').length;

  return { aplicados, erros, conflitos, detalhes };
}

export async function contarPendentes(tenantId: string): Promise<number> {
  const { data, error } = await supabase
    .from(LOTE_TABLE)
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', STATUS_ATIVOS);

  if (error) return 0;
  return (data || []).length;
}
