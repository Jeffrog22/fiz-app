import { supabase } from '../services/supabaseClient';

type Operacao = 'insercao' | 'atualizacao' | 'remocao' | 'extrapolacao' | 'cancelamento';

interface LogEntry {
  tenant_id: string;
  tabela: string;
  operacao: Operacao;
  registro_id?: string;
  dados?: Record<string, unknown>;
  professor_id?: string;
  ip?: string;
}

export async function registrarOperacao(entry: LogEntry): Promise<void> {
  const { error } = await supabase.from('logs_operacoes').insert({
    tenant_id: entry.tenant_id,
    tabela: entry.tabela,
    operacao: entry.operacao,
    registro_id: entry.registro_id,
    dados: entry.dados ? JSON.stringify(entry.dados) : null,
    professor_id: entry.professor_id,
    ip: entry.ip,
  });
  if (error) console.error('[logEngine] erro ao registrar operacao:', error.message);
}

export async function auditarAcesso(
  tenantId: string,
  professor: string,
  unidade: string,
  status: 'sucesso' | 'falha',
  ip?: string,
): Promise<void> {
  const { error } = await supabase.from('logs_acesso').insert({
    tenant_id: tenantId,
    professor,
    unidade,
    status,
    ip: ip || 'desconhecido',
  });
  if (error) console.error('[logEngine] erro ao auditar acesso:', error.message);
}

export async function calcularOcupacao(
  tenantId: string,
  turmaId: string,
): Promise<{ lotacao: number; capacidade: number }> {
  const { data: turma } = await supabase
    .from('turmas')
    .select('capacidade')
    .eq('tenant_id', tenantId)
    .eq('id', turmaId)
    .single();

  const capacidade = turma?.capacidade || 0;

  const { count } = await supabase
    .from('alunos')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('turma_id', turmaId)
    .eq('ativo', true);

  return { lotacao: count || 0, capacidade };
}

export async function ocupacaoPorTurmas(
  tenantId: string,
): Promise<Record<string, { lotacao: number; capacidade: number }>> {
  const { data: turmas } = await supabase
    .from('turmas')
    .select('id, capacidade')
    .eq('tenant_id', tenantId);

  if (!turmas) return {};

  const ids = turmas.map((t) => t.id);
  if (ids.length === 0) return {};

  const { data: alunos } = await supabase
    .from('alunos')
    .select('turma_id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .in('turma_id', ids);

  const counts: Record<string, number> = {};
  if (alunos) {
    for (const a of alunos) {
      if (a.turma_id) counts[a.turma_id] = (counts[a.turma_id] || 0) + 1;
    }
  }

  const result: Record<string, { lotacao: number; capacidade: number }> = {};
  for (const t of turmas) {
    result[t.id] = { lotacao: counts[t.id] || 0, capacidade: t.capacidade || 0 };
  }
  return result;
}
