import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export async function frequencia(tenantId: string, filters?: { mes?: number; ano?: number; aluno_id?: string }): Promise<any> {
  const { mes, ano, aluno_id } = filters || {};

  let query = supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId);

  if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    query = query
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-31`);
  }

  // Filtro por aluno específico (histórico)
  if (aluno_id) {
    query = query.eq('grupo_id', aluno_id);
  }

  const { data: chamadas, error } = await query.range(0, 1000000).order('data', { ascending: true });
  if (error) throw new AppError('Erro ao buscar frequencia', 500);

  const [alunos, turmas] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, nivel, horario, professor_id').eq('tenant_id', tenantId),
  ]);

  const alunosMap = new Map<string, any>();
  alunos.data?.forEach((a: any) => alunosMap.set(a.id, a));

  const turmasMap = new Map<string, any>();
  turmas.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const logsAluno = (chamadas || []).filter((r: any) => alunosMap.has(r.grupo_id));

  const totalRegistros = logsAluno.length;
  const presentes = logsAluno.filter((r: any) => r.status === 'presente').length;
  const faltas = logsAluno.filter((r: any) => r.status === 'falta').length;
  const justificados = logsAluno.filter((r: any) => r.status === 'justificado').length;

  const porNivel: Record<string, { total: number; presentes: number }> = {};
  const porHorario: Record<string, { total: number; presentes: number }> = {};
  const porProfessor: Record<string, { total: number; presentes: number }> = {};

  logsAluno.forEach((r: any) => {
    const aluno = alunosMap.get(r.grupo_id);
    const turmaAluno = turmasMap.get(aluno?.turma_id);

    const nivel = turmaAluno?.nivel || aluno?.nivel || 'Sem nivel';
    if (!porNivel[nivel]) porNivel[nivel] = { total: 0, presentes: 0 };
    porNivel[nivel].total++;
    if (r.status === 'presente') porNivel[nivel].presentes++;

    const periodo = (r.indice_aula ?? 0) < 6 ? 'Manha' : 'Tarde';
    if (!porHorario[periodo]) porHorario[periodo] = { total: 0, presentes: 0 };
    porHorario[periodo].total++;
    if (r.status === 'presente') porHorario[periodo].presentes++;

    const professor = turmaAluno?.professor_id || 'Geral';
    if (!porProfessor[professor]) porProfessor[professor] = { total: 0, presentes: 0 };
    porProfessor[professor].total++;
    if (r.status === 'presente') porProfessor[professor].presentes++;
  });

  return {
    resumo: { totalRegistros, presentes, faltas, justificados },
    porNivel,
    porHorario,
    porProfessor,
  };
}

export async function cancelamentos(tenantId: string, filters?: { mes?: number; ano?: number }): Promise<any> {
  const { mes, ano } = filters || {};

  let query = supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['justificado', 'cancelado']);

  if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    query = query
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-31`);
  }

  const { data, error } = await query.range(0, 1000000).order('data', { ascending: true });
  if (error) throw new AppError('Erro ao buscar cancelamentos', 500);

  const [alunos, turmas] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, nivel').eq('tenant_id', tenantId),
  ]);

  const alunosMap = new Map<string, any>();
  alunos.data?.forEach((a: any) => alunosMap.set(a.id, a));

  const turmasMap = new Map<string, any>();
  turmas.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const porMotivo: Record<string, number> = {};
  const porNivel: Record<string, number> = {};
  const porMes: Record<string, number> = {};

  const logsAluno = (data || []).filter((r: any) => alunosMap.has(r.grupo_id));

  logsAluno.forEach((r: any) => {
    const motivo = r.motivo || 'Sem motivo';
    porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;

    const aluno = alunosMap.get(r.grupo_id);
    const turmaAluno = turmasMap.get(aluno?.turma_id);
    const nivel = turmaAluno?.nivel || aluno?.nivel || 'Sem nivel';
    porNivel[nivel] = (porNivel[nivel] || 0) + 1;

    const mesKey = r.data ? r.data.substring(0, 7) : 'desconhecido';
    porMes[mesKey] = (porMes[mesKey] || 0) + 1;
  });

  return {
    total: logsAluno.length,
    porMotivo,
    porNivel,
    porMes,
    registros: logsAluno,
  };
}

export async function exportarCancelamentosCSV(tenantId: string, filters?: { mes?: number; ano?: number }): Promise<string> {
  const result = await cancelamentos(tenantId, filters);
  const linhas = ['data,grupo_id,status,motivo,indice_aula'];
  for (const r of result.registros) {
    linhas.push(`${r.data},${r.grupo_id},${r.status},${r.motivo || ''},${r.indice_aula}`);
  }
  return linhas.join('\n');
}

export async function vagas(tenantId: string): Promise<any[]> {
  const { data: turmas, error: turmasError } = await supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId);

  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('turma_id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const ocupacao: Record<string, number> = {};
  alunos?.forEach((a: any) => {
    if (a.turma_id) ocupacao[a.turma_id] = (ocupacao[a.turma_id] || 0) + 1;
  });

  return (turmas || []).map((t: any) => ({
    ...t,
    alunos_ativos: ocupacao[t.grupo_id || t.id] || 0,
    vagas_disponiveis: Math.max(0, (t.capacidade || 0) - (ocupacao[t.grupo_id || t.id] || 0)),
    excedente: Math.max(0, (ocupacao[t.grupo_id || t.id] || 0) - (t.capacidade || 0)),
  }));
}
