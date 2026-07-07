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

  if (aluno_id) {
    query = query.eq('grupo_id', aluno_id);
  }

  const { data: chamadas, error } = await query.range(0, 1000000).order('data', { ascending: true });
  if (error) throw new AppError('Erro ao buscar frequencia', 500);

  const [alunosResult, turmasResult, professoresResult] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, nivel, horario, professor_id').eq('tenant_id', tenantId),
    supabase.from('professores').select('id, nome').eq('tenant_id', tenantId),
  ]);

  if (alunosResult.error) throw new AppError('Erro ao buscar alunos: ' + alunosResult.error.message, 500);
  if (turmasResult.error) throw new AppError('Erro ao buscar turmas: ' + turmasResult.error.message, 500);

  const alunosMap = new Map<string, any>();
  alunosResult.data?.forEach((a: any) => alunosMap.set(a.id, a));

  const turmasMap = new Map<string, any>();
  turmasResult.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const professorMap = new Map<string, string>();
  professoresResult.data?.forEach((p: any) => professorMap.set(p.id, p.nome));

  const totalRegistros = chamadas?.length || 0;
  const presentes = chamadas?.filter((r: any) => r.status === 'presente').length || 0;
  const faltas = chamadas?.filter((r: any) => r.status === 'falta').length || 0;
  const justificados = chamadas?.filter((r: any) => r.status === 'justificado').length || 0;

  const porNivel: Record<string, { total: number; presentes: number }> = {};
  const porHorario: Record<string, { total: number; presentes: number }> = {};
  const porProfessor: Record<string, { total: number; presentes: number }> = {};

  const alunosFreq = new Map<string, { nome: string; total: number; presentes: number; justificados: number; faltas: number }>();

  (chamadas || []).forEach((r: any) => {
    const aluno = alunosMap.get(r.grupo_id);
    const turma = aluno ? turmasMap.get(aluno.turma_id) : turmasMap.get(r.grupo_id);

    const nivel = turma?.nivel || aluno?.nivel || 'Sem nivel';
    if (!porNivel[nivel]) porNivel[nivel] = { total: 0, presentes: 0 };
    porNivel[nivel].total++;
    if (r.status === 'presente') porNivel[nivel].presentes++;

    const periodo = (r.indice_aula ?? 0) < 6 ? 'Manha' : 'Tarde';
    if (!porHorario[periodo]) porHorario[periodo] = { total: 0, presentes: 0 };
    porHorario[periodo].total++;
    if (r.status === 'presente') porHorario[periodo].presentes++;

    const profKey = turma?.professor_id || 'Geral';
    const profNome = professorMap.get(profKey) || profKey;
    if (!porProfessor[profNome]) porProfessor[profNome] = { total: 0, presentes: 0 };
    porProfessor[profNome].total++;
    if (r.status === 'presente') porProfessor[profNome].presentes++;

    if (aluno) {
      if (!alunosFreq.has(aluno.id)) {
        alunosFreq.set(aluno.id, { nome: aluno.nome, total: 0, presentes: 0, justificados: 0, faltas: 0 });
      }
      const entry = alunosFreq.get(aluno.id)!;
      entry.total++;
      if (r.status === 'presente') entry.presentes++;
      if (r.status === 'justificado') entry.justificados++;
      if (r.status === 'falta') entry.faltas++;
    }
  });

  const alunosArray = Array.from(alunosFreq.values());
  const topPresenca = alunosArray
    .filter(a => a.total > 0)
    .sort((a, b) => (b.presentes / b.total) - (a.presentes / a.total))
    .slice(0, 5)
    .map(a => ({ nome: a.nome, presencas: a.presentes, total: a.total }));

  const topFaltas = alunosArray
    .sort((a, b) => b.faltas - a.faltas)
    .slice(0, 5)
    .map(a => ({ nome: a.nome, faltas: a.faltas, total: a.total }));

  return {
    resumo: { totalRegistros, presentes, faltas, justificados },
    porNivel,
    porHorario,
    porProfessor,
    topAlunos: { topPresenca, topFaltas },
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

  const [alunosResult, turmasResult] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, nivel').eq('tenant_id', tenantId),
  ]);

  if (alunosResult.error) throw new AppError('Erro ao buscar alunos: ' + alunosResult.error.message, 500);
  if (turmasResult.error) throw new AppError('Erro ao buscar turmas: ' + turmasResult.error.message, 500);

  const alunosMap = new Map<string, any>();
  alunosResult.data?.forEach((a: any) => alunosMap.set(a.id, a));

  const turmasMap = new Map<string, any>();
  turmasResult.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const porMotivo: Record<string, number> = {};
  const porNivel: Record<string, number> = {};
  const porMes: Record<string, number> = {};

  (data || []).forEach((r: any) => {
    const motivo = r.motivo || 'Sem motivo';
    porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;

    const aluno = alunosMap.get(r.grupo_id);
    const turma = aluno ? turmasMap.get(aluno.turma_id) : turmasMap.get(r.grupo_id);
    const nivel = turma?.nivel || aluno?.nivel || 'Sem nivel';
    porNivel[nivel] = (porNivel[nivel] || 0) + 1;

    const mesKey = r.data ? r.data.substring(0, 7) : 'desconhecido';
    porMes[mesKey] = (porMes[mesKey] || 0) + 1;
  });

  return {
    total: data?.length || 0,
    porMotivo,
    porNivel,
    porMes,
    registros: data || [],
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
