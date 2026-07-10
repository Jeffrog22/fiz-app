import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import ExcelJS from 'exceljs';
import path from 'path';
import type {
  FrequencyMetrics,
  FrequenciaData,
  FrequenciaPorNivel,
  FrequenciaPorHorario,
  FrequenciaPorPeriodo,
  FrequenciaPorProfessor,
  TopAlunoFrequencia,
  TopAlunoFalta,
  AlunoFrequenciaGrid,
  EnrollmentPeriodHistorico,
  TimelineData,
  TimelineSlot,
  CancelamentoDashboard,
  ControleMensalRow,
  ControleMensalLabel,
} from '../types';

const ABREV_MAP: Record<string, number> = {
  'Dom': 0, 'dom': 0,
  'Seg': 1, 'seg': 1,
  'Ter': 2, 'ter': 2,
  'Qua': 3, 'qua': 3,
  'Qui': 4, 'qui': 4,
  'Sex': 5, 'sex': 5,
  'Sab': 6, 'sab': 6,
};

function parseDiasFromLabel(label: string): number[] {
  if (!label) return [];
  const dias: number[] = [];
  for (const parte of label.split('/')) {
    const trimmed = parte.trim();
    const idx = ABREV_MAP[trimmed];
    if (idx !== undefined) dias.push(idx);
  }
  return [...new Set(dias)];
}

const CORES_MOTIVO: Record<string, string> = {
  'Doença': '#E74C3C',
  'Lesão': '#E67E22',
  'Viagem': '#3498DB',
  'Familiar': '#9B59B6',
  'Trabalho': '#1ABC9C',
  'Clima': '#F39C12',
  'Piscina': '#2ECC71',
};

function corParaMotivo(motivo: string, index: number): string {
  return CORES_MOTIVO[motivo] || `hsl(${(index * 47) % 360}, 70%, 55%)`;
}

async function calcularDiasPrevistosNoMes(tenantId: string, dataInicio: string, dataFim: string): Promise<{ dias: string[]; diasSemanaUnicos: number[] }> {
  const { data: turmas } = await supabase
    .from('turmas')
    .select('label')
    .eq('tenant_id', tenantId);

  const diasSemanaUnicos = new Set<number>();
  (turmas || []).forEach((t: any) => {
    if (t.label) {
      parseDiasFromLabel(t.label).forEach(d => diasSemanaUnicos.add(d));
    }
  });

  if (diasSemanaUnicos.size === 0) return { dias: [], diasSemanaUnicos: [] };

  // Subtrair eventos de calendario
  let diasEvento = new Set<string>();
  try {
    const { data: eventos } = await supabase
      .from('calendario')
      .select('data')
      .eq('tenant_id', tenantId)
      .gte('data', dataInicio)
      .lte('data', dataFim);
    if (eventos) diasEvento = new Set<string>(eventos.map(e => e.data));
  } catch { /* pode nao existir */ }

  const dias: string[] = [];
  const inicio = new Date(dataInicio + 'T12:00:00');
  const fim = new Date(dataFim + 'T12:00:00');
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (diasSemanaUnicos.has(d.getDay())) {
      const ds = d.toISOString().split('T')[0];
      if (!diasEvento.has(ds)) dias.push(ds);
    }
  }
  return { dias, diasSemanaUnicos: [...diasSemanaUnicos] };
}

async function calcularMetricasCore(tenantId: string, dataInicio: string, dataFim: string): Promise<FrequencyMetrics> {
  const { data: logs } = await supabase
    .from('chamadas_log')
    .select('data, grupo_id, status')
    .eq('tenant_id', tenantId)
    .neq('origem', 'calendario')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  const logsList = logs || [];
  if (logsList.length === 0) {
    return { diasConcluidos: 0, diasPrevistos: 0, aulasDadas: 0, aulasPrevistas: 0 };
  }

  // diasPrevistos = datas unicas com qualquer chamada (nao calendario)
  const uniqueDates = [...new Set<string>(logsList.map(l => l.data))].sort();
  const diasPrevistos = uniqueDates.length;

  // diasConcluidos = datas onde pelo menos 1 aula nao foi cancelada
  const diasComAula = uniqueDates.filter(d =>
    logsList.some(l => l.data === d && l.status !== 'cancelado')
  );
  const diasConcluidos = diasComAula.length;

  // aulasPrevistas = combinacoes unicas data|grupo_id
  const todasAulas = new Set<string>(logsList.map(l => `${l.data}|${l.grupo_id}`));
  const aulasPrevistas = todasAulas.size;

  // aulasDadas = combinacoes unicas data|grupo_id com status != cancelado
  const aulasDadas = new Set<string>(
    logsList.filter(l => l.status !== 'cancelado').map(l => `${l.data}|${l.grupo_id}`)
  ).size;

  return { diasConcluidos, diasPrevistos, aulasDadas, aulasPrevistas };
}

export async function controleMensal(
  tenantId: string,
  filters?: { mes?: number; ano?: number; label?: string; professor_id?: string; periodo?: 'semana' | 'mes' | 'ano' }
): Promise<ControleMensalLabel[]> {
  const { mes, ano, label, professor_id, periodo = 'mes' } = filters || {};

  let dataInicio: string;
  let dataFim: string;

  if (periodo === 'semana') {
    const agora = new Date();
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - 6); // Últimos 7 dias (incluindo hoje)
    dataInicio = inicio.toISOString().split('T')[0];
    dataFim = agora.toISOString().split('T')[0];
  } else if (periodo === 'ano') {
    const agora = new Date();
    dataInicio = `${agora.getFullYear()}-01-01`;
    dataFim = `${agora.getFullYear()}-12-31`;
  } else { // mes
    if (!mes || !ano) return [];
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    dataInicio = `${ano}-${mesStr}-01`;
    dataFim = `${ano}-${mesStr}-${ultimoDia}`;
  }

  // Buscar turmas
  let turmasQuery = supabase
    .from('turmas')
    .select('id, grupo_id, label, horario, professor_id, nivel')
    .eq('tenant_id', tenantId);

  if (label) turmasQuery = turmasQuery.eq('label', label);
  if (professor_id) turmasQuery = turmasQuery.eq('professor_id', professor_id);

  const { data: turmas } = await turmasQuery;
  if (!turmas || turmas.length === 0) return [];

  // Logs do periodo (excluindo calendario) — inclui status para filtrar cancelados
  // Nota: chamadas_log.grupo_id armazena o grupo_id da turma (ex: jeftq01)
  const { data: logs } = await supabase
    .from('chamadas_log')
    .select('data, grupo_id, status')
    .eq('tenant_id', tenantId)
    .neq('origem', 'calendario')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (!logs || logs.length === 0) return [];

  // Dias previstos = datas unicas dos logs
  const diasPrevList = [...new Set<string>(logs.map(l => l.data))].sort();

  // Set de todas as aulas (previstas) e set de aulas efetivamente dadas (nao canceladas)
  // logs.grupo_id = turma.grupo_id (ex: jeftq01) — usamos direto
  const aulasPrevSet = new Set<string>();
  const aulasDadasSet = new Set<string>();
  (logs || []).forEach((l: any) => {
    if (l.grupo_id) {
      aulasPrevSet.add(`${l.data}|${l.grupo_id}`);
      if (l.status !== 'cancelado') aulasDadasSet.add(`${l.data}|${l.grupo_id}`);
    }
  });
  console.log('[controleMensal] logs:', logs.length, 'diasPrevList:', diasPrevList.length, 'aulasPrevSet:', aulasPrevSet.size);

  // Buscar professores para nome
  const { data: professores } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);

  const profMap = new Map<string, string>();
  (professores || []).forEach((p: any) => profMap.set(p.id, p.nome));

  // Agrupar por label
  const labelMap = new Map<string, { turmas: any[]; profMap: Map<string, string> }>();
  for (const turma of turmas) {
    if (!turma.grupo_id || !turma.label) continue;
    const key = `${turma.label}|${turma.professor_id || ''}`;
    if (!labelMap.has(key)) labelMap.set(key, { turmas: [], profMap: new Map() });
    labelMap.get(key)!.turmas.push(turma);
  }

  const result: ControleMensalLabel[] = [];

  for (const [key, grupo] of labelMap) {
    const [labelStr, profId] = key.split('|');
    const profNome = profMap.get(profId) || profId || 'Geral';
    const diasSemana = parseDiasFromLabel(labelStr);
    if (diasSemana.length === 0) continue;

    // Filtrar dias previstos que caem nos dias da semana da label
    const diasEfetivos = diasPrevList.filter(d => diasSemana.includes(new Date(d + 'T12:00:00').getDay()));

    // Agrupar horarios
    const horarioMap = new Map<string, { dadas: number; previstas: number }>();
    for (const turma of grupo.turmas) {
      if (!turma.horario) continue;
      if (!horarioMap.has(turma.horario)) horarioMap.set(turma.horario, { dadas: 0, previstas: 0 });
      const entry = horarioMap.get(turma.horario)!;
      for (const dia of diasEfetivos) {
        const key = `${dia}|${turma.grupo_id}`;
        if (aulasPrevSet.has(key)) {
          entry.previstas++;
          if (aulasDadasSet.has(key)) entry.dadas++;
        }
      }
    }

    const horarios: ControleMensalRow[] = [];
    let totalDadas = 0;
    let totalPrevistas = 0;
    for (const [horario, h] of horarioMap) {
      horarios.push({ horario, dadas: h.dadas, previstas: h.previstas });
      totalDadas += h.dadas;
      totalPrevistas += h.previstas;
    }
    horarios.sort((a, b) => a.horario.localeCompare(b.horario));

    result.push({ label: labelStr, professor: profNome, horarios, totalDadas, totalPrevistas });
  }

  return result;
}

async function getDiasPrevistosNoPeriodo(tenantId: string, dataInicio: string, dataFim: string): Promise<string[]> {
  try {
    const { data: periodosData } = await supabase
      .from('periodos_letivos')
      .select('data')
      .eq('tenant_id', tenantId)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (!periodosData || periodosData.length === 0) return [];

    let dias = [...new Set<string>(periodosData.map(r => r.data))];

    const { data: eventos } = await supabase
      .from('calendario')
      .select('data')
      .eq('tenant_id', tenantId)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (eventos && eventos.length > 0) {
      const diasEvento = new Set<string>(eventos.map(e => e.data));
      dias = dias.filter(d => !diasEvento.has(d));
    }

    return dias;
  } catch {
    return [];
  }
}

export async function metricas(tenantId: string, filters?: { periodo?: 'semana' | 'mes' | 'ano' }): Promise<FrequencyMetrics> {
  const { periodo = 'mes' } = filters || {};
  const agora = new Date();
  let inicio: Date;

  switch (periodo) {
    case 'semana':
      inicio = new Date(agora);
      inicio.setDate(inicio.getDate() - 7);
      break;
    case 'ano':
      inicio = new Date(agora.getFullYear(), 0, 1);
      break;
    default:
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  }

  const dataInicio = inicio.toISOString().split('T')[0];
  const dataFim = agora.toISOString().split('T')[0];

  return calcularMetricasCore(tenantId, dataInicio, dataFim);
}

export async function timeline(tenantId: string, filters?: { mes?: number; ano?: number; label?: string; professor_id?: string; periodo?: "semana" | "mes" | "ano" }): Promise<TimelineData> {
  const { mes, ano, label, professor_id, periodo = "mes" } = filters || {};

  let dataInicio: string;
  let dataFim: string;

  if (periodo === "semana") {
    const agora = new Date();
    const inicio = new Date(agora);
    inicio.setDate(agora.getDate() - 6); // Últimos 7 dias (incluindo hoje)
    dataInicio = inicio.toISOString().split("T")[0];
    dataFim = agora.toISOString().split("T")[0];
  } else if (periodo === "ano") {
    const agora = new Date();
    dataInicio = `${agora.getFullYear()}-01-01`;
    dataFim = `${agora.getFullYear()}-12-31`;
  } else { // mes
    if (!mes || !ano) throw new AppError("Mês e ano são obrigatórios para o período mensal", 400);
    const mesStr = String(mes).padStart(2, "0");
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, "0");
    dataInicio = `${ano}-${mesStr}-01`;
    dataFim = `${ano}-${mesStr}-${ultimoDia}`;
  }

  let turmasQuery = supabase
    .from("turmas")
    .select("*")
    .eq("tenant_id", tenantId);

  if (label) turmasQuery = turmasQuery.eq("label", label);
  if (professor_id) turmasQuery = turmasQuery.eq("professor_id", professor_id);

  const { data: turmas, error: turmasError } = await turmasQuery;
  if (turmasError) throw new AppError("Erro ao buscar turmas", 500);

  // Montar query de chamadas com filtro de período
  let chamadasQuery = supabase
    .from("chamadas_log")
    .select("grupo_id, status")
    .gte("data", dataInicio)
    .lte("data", dataFim);

  const { data: chamadas, error: chamadasError } = await chamadasQuery;
  if (chamadasError) throw new AppError('Erro ao buscar chamadas', 500);

  // Agrupar chamadas por grupo_id
  const logsPorGrupo = new Map<string, { presentes: number; ausentes: number; justificados: number }>();
  (chamadas || []).forEach((l: any) => {
    if (!l.grupo_id) return;
    if (!logsPorGrupo.has(l.grupo_id)) logsPorGrupo.set(l.grupo_id, { presentes: 0, ausentes: 0, justificados: 0 });
    const entry = logsPorGrupo.get(l.grupo_id)!;
    if (l.status === 'presente') entry.presentes++;
    else if (l.status === 'falta') entry.ausentes++;
    else if (l.status === 'justificado' || l.status === 'cancelado') entry.justificados++;
  });

  const slots: TimelineSlot[] = [];

  for (const turma of turmas || []) {
    const grupoId = turma.grupo_id;
    if (!grupoId) continue;

    const counts = logsPorGrupo.get(grupoId) || { presentes: 0, ausentes: 0, justificados: 0 };
    const total = counts.presentes + counts.ausentes + counts.justificados;

    slots.push({
      horario: turma.horario,
      presentes: counts.presentes,
      ausentes: counts.ausentes,
      justificados: counts.justificados,
      total,
    });
  }

  const labels = [...new Set<string>((turmas || []).map(t => t.label).filter(Boolean))];

  let profsQuery = supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);

  if (filters?.professor_id) profsQuery = profsQuery.eq('id', filters.professor_id);

  const { data: professores } = await profsQuery;

  return {
    horarios: slots.map(s => s.horario),
    slots,
    labels,
    professores: professores || [],
  };
}
export async function frequencia(tenantId: string, filters?: { mes?: number; ano?: number; aluno_id?: string; periodo?: string }): Promise<FrequenciaData> {
  const { mes, ano, aluno_id, periodo } = filters || {};

  const [alunosResult, turmasResult, professoresResult] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id, ativo').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, label, nivel, horario, professor_id').eq('tenant_id', tenantId),
    supabase.from('professores').select('id, nome').eq('tenant_id', tenantId),
  ]);

  if (alunosResult.error) throw new AppError('Erro ao buscar alunos: ' + alunosResult.error.message, 500);
  if (turmasResult.error) throw new AppError('Erro ao buscar turmas: ' + turmasResult.error.message, 500);

  const alunosMap = new Map<string, any>();
  const alunosPorTurma = new Map<string, any[]>();
  alunosResult.data?.forEach((a: any) => {
    alunosMap.set(a.id, a);
    alunosMap.set(a.id.replace(/-/g, '').toLowerCase(), a);
    if (a.turma_id) {
      if (!alunosPorTurma.has(a.turma_id)) alunosPorTurma.set(a.turma_id, []);
      alunosPorTurma.get(a.turma_id)!.push(a);
    }
  });

  const turmasMap = new Map<string, any>();
  turmasResult.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const professorMap = new Map<string, string>();
  professoresResult.data?.forEach((p: any) => professorMap.set(p.id, p.nome));

  let query = supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId);

  if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    query = query
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-${ultimoDia}`);
  }

  let turmaIdDoAluno: string | undefined;
  if (aluno_id) {
    const aluno = alunosMap.get(aluno_id);
    turmaIdDoAluno = aluno?.turma_id;
    if (turmaIdDoAluno) {
      query = query.or(`grupo_id.eq.${aluno_id},grupo_id.eq.${turmaIdDoAluno}`);
    } else {
      query = query.eq('grupo_id', aluno_id);
    }
  }

  const { data: chamadas, error } = await query.order('data', { ascending: true }).range(0, 1000000);
  if (error) throw new AppError('Erro ao buscar frequencia', 500);

  console.log('[frequencia] chamadas:', chamadas?.length, 'alunosPorTurma:', alunosPorTurma.size, 'turmasMap:', turmasMap.size);

  const totalRegistros = chamadas?.length || 0;
  const presentes = chamadas?.filter((r: any) => r.status === 'presente').length || 0;
  const faltas = chamadas?.filter((r: any) => r.status === 'falta').length || 0;
  const justificados = chamadas?.filter((r: any) => r.status === 'justificado').length || 0;

  const porNivelMap = new Map<string, { total: number; presentes: number }>();
  const porHorarioMap = new Map<string, { total: number; presentes: number }>();
  const porPeriodoMap = new Map<string, { total: number; presentes: number }>();
  const porProfessorMap = new Map<string, { total: number; presentes: number }>();

  const alunosFreq = new Map<string, { nome: string; total: number; presentes: number; justificados: number; faltas: number }>();

  (chamadas || []).forEach((r: any) => {
    // grupo_id pode ser UUID (aluno.id para P/F/J manual) ou TEXT (turmas.grupo_id para extrapolacao)
    const isAlunoId = typeof r.grupo_id === 'string' && r.grupo_id.includes('-');
    let turma: any;
    let alunosParaContar: any[] = [];

    if (isAlunoId) {
      const aluno = alunosMap.get(r.grupo_id);
      if (aluno) {
        alunosParaContar = [aluno];
        turma = turmasMap.get(aluno.turma_id);
      }
    } else {
      turma = r.grupo_id ? turmasMap.get(r.grupo_id) : undefined;
      alunosParaContar = r.grupo_id ? alunosPorTurma.get(r.grupo_id) || [] : [];
    }

    // status null = aula ocorreu normalmente (presente)
    const statusEfetivo = r.status || 'presente';

    const nivel = turma?.nivel || 'Sem nivel';
    if (!porNivelMap.has(nivel)) porNivelMap.set(nivel, { total: 0, presentes: 0 });
    const nv = porNivelMap.get(nivel)!;
    nv.total++;
    if (statusEfetivo === 'presente') nv.presentes++;

    const horario = turma?.horario || 'Sem horario';
    if (!porHorarioMap.has(horario)) porHorarioMap.set(horario, { total: 0, presentes: 0 });
    const hr = porHorarioMap.get(horario)!;
    hr.total++;
    if (statusEfetivo === 'presente') hr.presentes++;

    const periodoStr = (r.indice_aula ?? 0) < 6 ? 'manhã' : 'tarde';
    if (!porPeriodoMap.has(periodoStr)) porPeriodoMap.set(periodoStr, { total: 0, presentes: 0 });
    const pd = porPeriodoMap.get(periodoStr)!;
    pd.total++;
    if (statusEfetivo === 'presente') pd.presentes++;

    const profKey = turma?.professor_id || 'Geral';
    const profNome = professorMap.get(profKey) || profKey;
    if (!porProfessorMap.has(profNome)) porProfessorMap.set(profNome, { total: 0, presentes: 0 });
    const pf = porProfessorMap.get(profNome)!;
    pf.total++;
    if (statusEfetivo === 'presente') pf.presentes++;

    if (alunosParaContar.length > 0) {
      for (const aluno of alunosParaContar) {
        if (!alunosFreq.has(aluno.id)) {
          alunosFreq.set(aluno.id, { nome: aluno.nome, total: 0, presentes: 0, justificados: 0, faltas: 0 });
        }
        const entry = alunosFreq.get(aluno.id)!;
        entry.total++;
        if (statusEfetivo === 'presente') entry.presentes++;
        if (statusEfetivo === 'justificado') entry.justificados++;
        if (statusEfetivo === 'falta') entry.faltas++;
      }
    }
  });

  console.log('[frequencia] porNivelMap:', porNivelMap.size, 'alunosFreq:', alunosFreq.size, 'turma key sample:', chamadas?.[0]?.grupo_id);

  const totalAlunos = alunosResult.data?.length || 0;
  const ativos = alunosResult.data?.filter((a: any) => a.ativo !== false).length || 0;
  const inativos = totalAlunos - ativos;

  const alunosComRegistro = Array.from(alunosFreq.values());
  const frequenciaMedia = alunosComRegistro.length > 0
    ? Math.round((alunosComRegistro.reduce((acc, a) => acc + (a.total > 0 ? a.presentes / a.total : 0), 0) / alunosComRegistro.length) * 100)
    : 0;

  let retencaoMedia = 0;
  try {
    const { data: enrollments } = await supabase
      .from('enrollment_period')
      .select('data_inicio, data_fim')
      .eq('tenant_id', tenantId);

    if (enrollments && enrollments.length > 0) {
      let totalPct = 0;
      for (const e of enrollments) {
        const inicio = new Date(e.data_inicio).getTime();
        const fim = e.data_fim ? new Date(e.data_fim).getTime() : Date.now();
        const diasPeriodo = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)));
        const diasDesdeInicio = Math.max(1, Math.ceil((Date.now() - inicio) / (1000 * 60 * 60 * 24)));
        totalPct += Math.min(100, Math.round((diasPeriodo / diasDesdeInicio) * 100));
      }
      retencaoMedia = Math.round(totalPct / enrollments.length);
    }
  } catch {
    /* enrollment_period pode não ter dados ou tabela */
  }

  const porNivel: FrequenciaPorNivel[] = Array.from(porNivelMap.entries()).map(([nivel, data]) => ({
    nivel,
    percentual: data.total > 0 ? Math.round((data.presentes / data.total) * 100) : 0,
    total: data.total,
  }));

  const porHorario: FrequenciaPorHorario[] = Array.from(porHorarioMap.entries()).map(([horario, data]) => ({
    horario,
    percentual: data.total > 0 ? Math.round((data.presentes / data.total) * 100) : 0,
  }));

  const porPeriodo: FrequenciaPorPeriodo[] = Array.from(porPeriodoMap.entries()).map(([periodo, data]) => ({
    periodo,
    percentual: data.total > 0 ? Math.round((data.presentes / data.total) * 100) : 0,
  }));

  const porProfessor: FrequenciaPorProfessor[] = Array.from(porProfessorMap.entries()).map(([professor, data]) => ({
    professor,
    percentual: data.total > 0 ? Math.round((data.presentes / data.total) * 100) : 0,
  }));

  const alunosGrid: AlunoFrequenciaGrid[] = (alunosResult.data || []).map((a: any) => {
    const freq = alunosFreq.get(a.id);
    const total = freq?.total || 0;
    const presencas = freq?.presentes || 0;
    return {
      id: a.id,
      nome: a.nome,
      ativo: a.ativo ?? true,
      presencas,
      justificativas: freq?.justificados || 0,
      faltas: freq?.faltas || 0,
      total,
      taxa: total > 0 ? Math.round((presencas / total) * 100) : 0,
    };
  });

  const topPresenca: TopAlunoFrequencia[] = alunosComRegistro
    .filter(a => a.total > 0)
    .sort((a, b) => (b.presentes / b.total) - (a.presentes / a.total))
    .slice(0, 5)
    .map(a => {
      const aluno = Array.from(alunosMap.values()).find((al: any) => al.nome === a.nome);
      return { id: aluno?.id || '', nome: a.nome, presencas: a.presentes, total: a.total, taxa: Math.round((a.presentes / a.total) * 100) };
    });

  const topFaltas: TopAlunoFalta[] = alunosComRegistro
    .sort((a, b) => b.faltas - a.faltas)
    .slice(0, 5)
    .map(a => ({ id: '', nome: a.nome, faltas: a.faltas }));

  const result: FrequenciaData = {
    metrics: { diasConcluidos: 0, diasPrevistos: 0, aulasDadas: 0, aulasPrevistas: 0 },
    resumo: { totalRegistros, presentes, faltas, justificados },
    porNivel,
    porHorario,
    porPeriodo,
    porProfessor,
    topAlunos: { topPresenca, topFaltas },
    alunosGrid,
    alunosResumo: { total: totalAlunos, ativos, inativos, retencaoMedia, frequenciaMedia },
  };

  if (periodo) {
    const agora = new Date();
    let inicio: Date;
    switch (periodo) {
      case 'semana':
        inicio = new Date(agora);
        inicio.setDate(inicio.getDate() - 7);
        break;
      case 'ano':
        inicio = new Date(agora.getFullYear(), 0, 1);
        break;
      default:
        inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    }
    const dataInicio = inicio.toISOString().split('T')[0];
    const dataFim = agora.toISOString().split('T')[0];
    result.metrics = await calcularMetricasCore(tenantId, dataInicio, dataFim);
  } else if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    result.metrics = await calcularMetricasCore(tenantId, `${ano}-${mesStr}-01`, `${ano}-${mesStr}-${ultimoDia}`);
  }

  // Montar timeline a partir das chamadas já carregadas
  // Mapeia chamadas para turma.grupo_id: UUID → resolve aluno → turma_id, TEXT → usa direto
  const timelinePorGrupo = new Map<string, { presentes: number; ausentes: number; justificados: number }>();
  (chamadas || []).forEach((l: any) => {
    if (!l.grupo_id) return;
    const isAlunoId = l.grupo_id.includes('-');
    const chave = isAlunoId
      ? alunosMap.get(l.grupo_id)?.turma_id || l.grupo_id
      : l.grupo_id;
    if (!timelinePorGrupo.has(chave)) timelinePorGrupo.set(chave, { presentes: 0, ausentes: 0, justificados: 0 });
    const entry = timelinePorGrupo.get(chave)!;
    const s = l.status || 'presente';
    if (s === 'presente') entry.presentes++;
    else if (s === 'falta') entry.ausentes++;
    else if (s === 'justificado' || s === 'cancelado') entry.justificados++;
  });

  const timelineSlots: TimelineSlot[] = [];
  for (const turma of turmasResult.data || []) {
    const grupoId = turma.grupo_id;
    if (!grupoId) continue;
    const counts = timelinePorGrupo.get(grupoId) || { presentes: 0, ausentes: 0, justificados: 0 };
    const total = counts.presentes + counts.ausentes + counts.justificados;
    if (total === 0) continue;
    timelineSlots.push({
      horario: turma.horario,
      presentes: counts.presentes,
      ausentes: counts.ausentes,
      justificados: counts.justificados,
      total,
    });
  }

  const timelineLabels = [...new Set<string>((turmasResult.data || []).map(t => t.label).filter(Boolean))];

  result.timeline = {
    horarios: timelineSlots.map(s => s.horario),
    slots: timelineSlots,
    labels: timelineLabels,
    professores: professoresResult.data || [],
  };

  if (aluno_id) {
    const { data: periods, error: periodsError } = await supabase
      .from('enrollment_period')
      .select('*')
      .eq('aluno_id', aluno_id)
      .order('data_inicio', { ascending: true });

    if (!periodsError && periods) {
      const turmasLookup = new Map<string, any>();
      turmasResult.data?.forEach((t: any) => {
        turmasLookup.set(t.id, t);
        if (t.grupo_id) turmasLookup.set(t.grupo_id, t);
      });

      const enrollmentPeriods: EnrollmentPeriodHistorico[] = periods.map((p: any) => {
        const turma = turmasLookup.get(p.turma_id);
        const inicio = new Date(p.data_inicio).getTime();
        const fim = p.data_fim ? new Date(p.data_fim).getTime() : Date.now();
        const permanenciaDias = Math.max(0, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)));

        const logsDoPeriodo = (chamadas || []).filter(
          (l: any) => (l.grupo_id === aluno_id || l.grupo_id === turmaIdDoAluno) && l.data >= p.data_inicio && l.data <= (p.data_fim || '2099-12-31')
        );
        const total = logsDoPeriodo.length;
        const presentesPeriodo = logsDoPeriodo.filter((l: any) => l.status === 'presente').length;
        const faltasPeriodo = logsDoPeriodo.filter((l: any) => l.status === 'falta').length;
        const justificadosPeriodo = logsDoPeriodo.filter((l: any) => l.status === 'justificado').length;

        return {
          nivel: turma?.nivel || 'Sem nivel',
          turma_label: turma ? `${turma.nivel || ''} ${(turma.horario || '').substring(0, 5)}`.trim() : 'Turma',
          data_inicio: p.data_inicio,
          data_fim: p.data_fim,
          permanenciaDias,
          total,
          presentes: presentesPeriodo,
          faltas: faltasPeriodo,
          justificados: justificadosPeriodo,
          assiduidade: total > 0 ? Math.round((presentesPeriodo / total) * 100) : 0,
        };
      });

      const totalDias = enrollmentPeriods.reduce((acc: number, p: any) => {
        const inicio = new Date(p.data_inicio).getTime();
        const fim = p.data_fim ? new Date(p.data_fim).getTime() : Date.now();
        return acc + Math.max(0, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)));
      }, 0);

      const primeiraData = enrollmentPeriods.length > 0 ? enrollmentPeriods[0].data_inicio : null;
      const diasDesdeInicio = primeiraData
        ? Math.max(1, Math.ceil((Date.now() - new Date(primeiraData).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

      result.enrollmentPeriods = enrollmentPeriods;
      result.retencao = {
        totalDias,
        diasDesdeInicio,
        percentual: Math.min(100, Math.round((totalDias / diasDesdeInicio) * 100)),
      };
    }
  }

  return result;
}

export async function cancelamentos(tenantId: string, filters?: { mes?: number; ano?: number; incluir_justificados?: boolean }): Promise<CancelamentoDashboard> {
  const { mes, ano, incluir_justificados } = filters || {};

  const statusFilter = incluir_justificados ? ['cancelado', 'justificado'] : ['cancelado'];

  let query = supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', statusFilter);

  if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    query = query
      .gte('data', `${ano}-${mesStr}-01`)
      .lte('data', `${ano}-${mesStr}-${ultimoDia}`);
  }

  const { data, error } = await query.order('data', { ascending: true });
  if (error) throw new AppError('Erro ao buscar cancelamentos', 500);

  const [alunosResult, turmasResult, professoresResult] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, nivel, horario, professor_id').eq('tenant_id', tenantId),
    supabase.from('professores').select('id, nome').eq('tenant_id', tenantId),
  ]);

  if (alunosResult.error) throw new AppError('Erro ao buscar alunos: ' + alunosResult.error.message, 500);
  if (turmasResult.error) throw new AppError('Erro ao buscar turmas: ' + turmasResult.error.message, 500);

  const turmasMap = new Map<string, any>();
  turmasResult.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const professorMap = new Map<string, string>();
  professoresResult?.data?.forEach((p: any) => professorMap.set(p.id, p.nome));

  const porMotivo = new Map<string, number>();
  const porNivelMap = new Map<string, number>();
  const porMesMap = new Map<string, number>();
  const porPeriodoMap = new Map<string, number>();

  console.log('[cancelamentos] chamadas:', data?.length, 'turmasMap:', turmasMap.size);

  for (const r of data || []) {
    const motivo = r.motivo || 'Sem motivo';
    porMotivo.set(motivo, (porMotivo.get(motivo) || 0) + 1);

    const turma = turmasMap.get(r.grupo_id);
    const nivel = turma?.nivel || 'Sem nivel';
    porNivelMap.set(nivel, (porNivelMap.get(nivel) || 0) + 1);

    r.horario = turma?.horario || '';
    r.nivel = nivel;

    const mesKey = r.data ? r.data.substring(0, 7) : 'desconhecido';
    porMesMap.set(mesKey, (porMesMap.get(mesKey) || 0) + 1);

    const periodo = (r.indice_aula ?? 0) < 6 ? 'manhã' : 'tarde';
    porPeriodoMap.set(periodo, (porPeriodoMap.get(periodo) || 0) + 1);
  }

  console.log('[cancelamentos] porNivelMap:', porNivelMap.size, 'first:', porNivelMap.size > 0 ? Array.from(porNivelMap.keys())[0] : 'none');

  const total = data?.length || 0;
  const registros = data || [];

  const distribuicaoMotivo = Array.from(porMotivo.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([motivo, totalCount], i) => ({ motivo, total: totalCount, cor: corParaMotivo(motivo, i) }));

  const porNivel = Array.from(porNivelMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nivel, count]) => ({ nivel, total: count }));

  const porPeriodo = Array.from(porPeriodoMap.entries())
    .map(([periodo, count]) => ({ periodo, total: count }));

  const evolucaoMensal = Array.from(porMesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, count]) => ({ mes, total: count }));

  const motivoFrequente = distribuicaoMotivo.length > 0
    ? { motivo: distribuicaoMotivo[0].motivo, count: distribuicaoMotivo[0].total }
    : { motivo: '', count: 0 };

  const nivelCritico = porNivel.length > 0
    ? { nivel: porNivel[0].nivel, count: porNivel[0].total }
    : { nivel: '', count: 0 };

  const mesCritico = evolucaoMensal.length > 0
    ? (() => { const max = evolucaoMensal.reduce((a, b) => a.total > b.total ? a : b); return { mes: max.mes, count: max.total }; })()
    : { mes: '', count: 0 };

  return {
    total,
    motivoFrequente,
    nivelCritico,
    mesCritico,
    evolucaoMensal,
    distribuicaoMotivo,
    porNivel,
    porPeriodo,
    registros,
  };
}

export async function exportarCancelamentosCSV(tenantId: string, filters?: { mes?: number; ano?: number; incluir_justificados?: boolean }): Promise<string> {
  const result = await cancelamentos(tenantId, filters);
  const linhas = ['data,grupo_id,status,motivo,indice_aula'];
  for (const r of result.registros) {
    linhas.push(`${r.data},${r.grupo_id},${r.status},${r.motivo || ''},${r.indice_aula}`);
  }
  return linhas.join('\n');
}

export async function exportarCancelamentosXLSX(tenantId: string, filters?: { mes?: number; ano?: number; incluir_justificados?: boolean }): Promise<Buffer> {
  const dashboard = await cancelamentos(tenantId, filters);
  const templatePath = path.resolve(__dirname, '../templates/relatorioCancelamentos.xlsx');

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(templatePath);
  } catch {
    workbook.addWorksheet('Registros');
  }

  let sheet = workbook.getWorksheet('Registros');
  if (!sheet) {
    sheet = workbook.addWorksheet('Registros');
  }

  const headers = ['Data', 'Horário', 'Nível', 'Professor', 'Tipo', 'Motivo', 'Origem'];
  sheet.getRow(1).values = headers;
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };

  const registros = dashboard.registros as any[];
  registros.forEach((r: any, i: number) => {
    const row = sheet.getRow(i + 2);
    row.values = [r.data, r.horario, r.nivel, r.professor, r.tipo, r.motivo, r.origem];
  });

  sheet.columns = [
    { header: 'Data', key: 'data', width: 14 },
    { header: 'Horário', key: 'horario', width: 10 },
    { header: 'Nível', key: 'nivel', width: 18 },
    { header: 'Professor', key: 'professor', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Motivo', key: 'motivo', width: 25 },
    { header: 'Origem', key: 'origem', width: 14 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
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
