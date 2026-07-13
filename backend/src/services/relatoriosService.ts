import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import type {
  FrequenciaAlunoItem, FrequenciaTurmaItem, RotatividadeItem, ExclusaoStatsItem,
  CancelamentoData, CancelamentoItem, PiscinaHistoricoData, PiscinaRegistro,
  DemograficoData, DemograficoItem, OcupacaoData, OcupacaoTurmaItem,
} from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function frequenciaAluno(
  tenantId: string,
  mes: number,
  ano: number
): Promise<FrequenciaAlunoItem[]> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data: logs, error: logsError } = await supabase
    .from('chamadas_log')
    .select('grupo_id, status')
    .eq('tenant_id', tenantId)
    .gte('data', inicio)
    .lte('data', fim);

  if (logsError) throw new AppError('Erro ao buscar chamadas', 500);

  if (!logs || logs.length === 0) return [];

  const alunoIds = [...new Set(logs.map((l: any) => l.grupo_id))].filter((id) => UUID_RE.test(id as string));

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id, nome, turma_id')
    .in('id', alunoIds);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const alunoMap = new Map((alunos || []).map((a: any) => [a.id, a]));

  const { data: turmas, error: turmasError } = await supabase
    .from('turmas')
    .select('grupo_id, label, horario, professor_id, nivel')
    .eq('tenant_id', tenantId);

  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

  const turmaMap = new Map((turmas || []).map((t: any) => [t.grupo_id, t]));

  const { data: professores, error: profsError } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);

  if (profsError) throw new AppError('Erro ao buscar professores', 500);

  const profMap = new Map((professores || []).map((p: any) => [p.id, p.nome]));

  const aggr = new Map<string, { presente: number; falta: number; justificado: number; cancelado: number }>();

  for (const log of logs) {
    const s = log.status;
    if (!aggr.has(log.grupo_id)) {
      aggr.set(log.grupo_id, { presente: 0, falta: 0, justificado: 0, cancelado: 0 });
    }
    const entry = aggr.get(log.grupo_id)!;
    if (s === 'presente') entry.presente++;
    else if (s === 'falta') entry.falta++;
    else if (s === 'justificado') entry.justificado++;
    else if (s === 'cancelado') entry.cancelado++;
  }

  const result: FrequenciaAlunoItem[] = [];

  for (const [alunoId, counts] of aggr) {
    const aluno = alunoMap.get(alunoId);
    if (!aluno) continue;
    const total = counts.presente + counts.falta + counts.justificado;
    const turma = aluno.turma_id ? turmaMap.get(aluno.turma_id) : undefined;
    result.push({
      aluno_id: alunoId,
      nome: aluno.nome || '---',
      turma_label: turma?.label,
      professor: turma?.professor_id ? profMap.get(turma.professor_id) || '-' : '-',
      ...counts,
      total_aulas: total,
      percentual_presenca: total > 0 ? Math.round((counts.presente / total) * 100) : 0,
    });
  }

  result.sort((a, b) => a.nome.localeCompare(b.nome));
  return result;
}

export async function frequenciaTurma(
  tenantId: string,
  mes: number,
  ano: number
): Promise<FrequenciaTurmaItem[]> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data: logs, error: logsError } = await supabase
    .from('chamadas_log')
    .select('grupo_id, status')
    .eq('tenant_id', tenantId)
    .gte('data', inicio)
    .lte('data', fim);

  if (logsError) throw new AppError('Erro ao buscar chamadas', 500);

  if (!logs || logs.length === 0) return [];

  const alunoIds = [...new Set(logs.map((l: any) => l.grupo_id))].filter((id) => UUID_RE.test(id as string));

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('id, turma_id')
    .in('id', alunoIds);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const turmaDeAluno = new Map((alunos || []).map((a: any) => [a.id, a.turma_id]));

  const { data: turmas, error: turmasError } = await supabase
    .from('turmas')
    .select('grupo_id, label, horario, professor_id, nivel')
    .eq('tenant_id', tenantId);

  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

  const turmaMap = new Map((turmas || []).map((t: any) => [t.grupo_id, t]));

  const { data: professores, error: profsError } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);

  if (profsError) throw new AppError('Erro ao buscar professores', 500);

  const profMap = new Map((professores || []).map((p: any) => [p.id, p.nome]));

  const aggr = new Map<string, { presente: number; falta: number; justificado: number; cancelado: number; total_aulas: number; alunos_unicos: Set<string> }>();

  for (const log of logs) {
    const turmaId = turmaDeAluno.get(log.grupo_id);
    if (!turmaId) continue;
    if (!aggr.has(turmaId)) {
      aggr.set(turmaId, { presente: 0, falta: 0, justificado: 0, cancelado: 0, total_aulas: 0, alunos_unicos: new Set() });
    }
    const entry = aggr.get(turmaId)!;
    const s = log.status;
    if (s === 'presente') entry.presente++;
    else if (s === 'falta') entry.falta++;
    else if (s === 'justificado') entry.justificado++;
    else if (s === 'cancelado') entry.cancelado++;
    entry.alunos_unicos.add(log.grupo_id);
  }

  const result: FrequenciaTurmaItem[] = [];

  for (const [grupoId, counts] of aggr) {
    const turma = turmaMap.get(grupoId);
    if (!turma) continue;
    const total = counts.presente + counts.falta + counts.justificado;
    result.push({
      grupo_id: grupoId,
      label: turma.label || '',
      horario: turma.horario || '',
      professor: turma.professor_id ? profMap.get(turma.professor_id) || '-' : '-',
      professor_id: turma.professor_id || '',
      nivel: turma.nivel || '',
      presente: counts.presente,
      falta: counts.falta,
      justificado: counts.justificado,
      cancelado: counts.cancelado,
      total_aulas: total,
      percentual_presenca: total > 0 ? Math.round((counts.presente / total) * 100) : 0,
    });
  }

  result.sort((a, b) => a.horario.localeCompare(b.horario));
  return result;
}

export async function rotatividade(
  tenantId: string,
  mes: number,
  ano: number
): Promise<RotatividadeItem[]> {
  const anoStr = String(ano);

  const { data, error } = await supabase
    .from('enrollment_period')
    .select('data_inicio, motivo')
    .eq('tenant_id', tenantId)
    .gte('data_inicio', `${anoStr}-01-01`)
    .lte('data_inicio', `${anoStr}-12-31`);

  if (error) throw new AppError('Erro ao buscar enrollment', 500);

  const aggr = new Map<number, { matricula_inicial: number; correcao: number; transferencia: number }>();

  for (const item of data || []) {
    const m = new Date(item.data_inicio).getMonth() + 1;
    if (!aggr.has(m)) {
      aggr.set(m, { matricula_inicial: 0, correcao: 0, transferencia: 0 });
    }
    const entry = aggr.get(m)!;
    if (item.motivo === 'matricula_inicial') entry.matricula_inicial++;
    else if (item.motivo === 'correcao') entry.correcao++;
    else if (item.motivo === 'transferencia') entry.transferencia++;
  }

  const result: RotatividadeItem[] = [];
  for (let m = 1; m <= 12; m++) {
    if (mes && m !== mes) continue;
    const entry = aggr.get(m) || { matricula_inicial: 0, correcao: 0, transferencia: 0 };
    result.push({
      mes: m,
      ...entry,
      total: entry.matricula_inicial + entry.correcao + entry.transferencia,
    });
  }

  return result;
}

export async function exclusoesStats(
  tenantId: string,
  mes: number,
  ano: number
): Promise<{ porMotivo: ExclusaoStatsItem[]; total: number }> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('exclusoes')
    .select('motivo')
    .eq('tenant_id', tenantId)
    .eq('oculto', false)
    .gte('data_exclusao', inicio)
    .lte('data_exclusao', fim);

  if (error) throw new AppError('Erro ao buscar exclusoes', 500);

  const aggr = new Map<string, number>();
  for (const item of data || []) {
    aggr.set(item.motivo, (aggr.get(item.motivo) || 0) + 1);
  }

  const total = (data || []).length;
  const porMotivo: ExclusaoStatsItem[] = Array.from(aggr.entries())
    .map(([motivo, count]) => ({
      motivo,
      total: count,
      percentual: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return { porMotivo, total };
}

export async function cancelamentos(
  tenantId: string,
  mes: number,
  ano: number
): Promise<CancelamentoData> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('chamadas_log')
    .select('status, motivo, data')
    .eq('tenant_id', tenantId)
    .eq('status', 'cancelado')
    .gte('data', inicio)
    .lte('data', fim);

  if (error) throw new AppError('Erro ao buscar cancelamentos', 500);

  const total = (data || []).length;
  const porMotivoMap = new Map<string, number>();
  const porMesMap = new Map<number, number>();

  for (const item of data || []) {
    const motivo = item.motivo || 'outro';
    porMotivoMap.set(motivo, (porMotivoMap.get(motivo) || 0) + 1);
    const m = new Date(item.data).getMonth() + 1;
    porMesMap.set(m, (porMesMap.get(m) || 0) + 1);
  }

  const porMotivo: CancelamentoItem[] = Array.from(porMotivoMap.entries())
    .map(([motivo, count]) => ({
      motivo,
      total: count,
      percentual: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const porMes = Array.from(porMesMap.entries())
    .map(([m, count]) => ({ mes: m, total: count }))
    .sort((a, b) => a.mes - b.mes);

  return { total, porMotivo, porMes };
}

export async function piscinaHistorico(
  tenantId: string,
  mes: number,
  ano: number
): Promise<PiscinaHistoricoData> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('card_aula')
    .select('data, temperatura_piscina, temperatura_externa, cloro_ppm, condicao_clima')
    .eq('tenant_id', tenantId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true });

  if (error) throw new AppError('Erro ao buscar histórico da piscina', 500);

  const registros: PiscinaRegistro[] = (data || []).map((r: any) => ({
    data: r.data,
    temperatura_piscina: r.temperatura_piscina,
    temperatura_externa: r.temperatura_externa,
    cloro_ppm: r.cloro_ppm,
    condicao_clima: r.condicao_clima,
  }));

  const tempsPiscina = registros.filter((r) => r.temperatura_piscina != null).map((r) => r.temperatura_piscina!);
  const tempsExterna = registros.filter((r) => r.temperatura_externa != null).map((r) => r.temperatura_externa!);
  const cloros = registros.filter((r) => r.cloro_ppm != null).map((r) => r.cloro_ppm!);

  const media = (vals: number[]) =>
    vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0;

  return {
    registros,
    medias: {
      temperatura_piscina: media(tempsPiscina),
      temperatura_externa: media(tempsExterna),
      cloro_ppm: media(cloros),
    },
    dias_frios: tempsPiscina.filter((t) => t < 25).length,
  };
}

export async function demografico(tenantId: string): Promise<DemograficoData> {
  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome, data_nascimento, genero, categoria')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (error) throw new AppError('Erro ao buscar alunos', 500);

  const alunos = data || [];
  const total = alunos.length;

  const porCategoriaMap = new Map<string, number>();
  const porGeneroMap = new Map<string, number>();
  let somaIdades = 0;
  let countIdade = 0;

  for (const a of alunos) {
    if (a.categoria) porCategoriaMap.set(a.categoria, (porCategoriaMap.get(a.categoria) || 0) + 1);
    if (a.genero) porGeneroMap.set(a.genero, (porGeneroMap.get(a.genero) || 0) + 1);
    if (a.data_nascimento) {
      const nasc = new Date(a.data_nascimento);
      const hoje = new Date();
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
      somaIdades += idade;
      countIdade++;
    }
  }

  const toItems = (map: Map<string, number>): DemograficoItem[] =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, total: count, percentual: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

  return {
    total,
    media_idade: countIdade > 0 ? Math.round((somaIdades / countIdade) * 10) / 10 : 0,
    porCategoria: toItems(porCategoriaMap),
    porGenero: toItems(porGeneroMap),
  };
}

export async function ocupacao(tenantId: string): Promise<OcupacaoData> {
  const { data: turmas, error: turmasError } = await supabase
    .from('turmas')
    .select('grupo_id, label, horario, professor_id, nivel, capacidade')
    .eq('tenant_id', tenantId)
    .order('horario', { ascending: true });

  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('turma_id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const { data: professores, error: profsError } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);

  if (profsError) throw new AppError('Erro ao buscar professores', 500);

  const profMap = new Map((professores || []).map((p: any) => [p.id, p.nome]));
  const ocupacaoMap = new Map<string, number>();
  for (const a of alunos || []) {
    if (a.turma_id) ocupacaoMap.set(a.turma_id, (ocupacaoMap.get(a.turma_id) || 0) + 1);
  }

  const items: OcupacaoTurmaItem[] = (turmas || []).map((t: any) => {
    const cap = t.capacidade || 0;
    const ocup = ocupacaoMap.get(t.grupo_id || t.id) || 0;
    return {
      grupo_id: t.grupo_id || t.id,
      label: t.label || '',
      horario: t.horario || '',
      professor: t.professor_id ? profMap.get(t.professor_id) || '-' : '-',
      capacidade: cap,
      ocupacao: ocup,
      percentual: cap > 0 ? Math.round((ocup / cap) * 100) : 0,
    };
  });

  const total_capacidade = items.reduce((s, i) => s + i.capacidade, 0);
  const total_ativos = items.reduce((s, i) => s + i.ocupacao, 0);

  return { turmas: items, total_capacidade, total_ativos };
}
