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
} from '../types';

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

async function calcularMetricasCore(tenantId: string, dataInicio: string, dataFim: string): Promise<FrequencyMetrics> {
  const { data: diasAulaData } = await supabase
    .from('chamadas_log')
    .select('data')
    .eq('tenant_id', tenantId)
    .gte('data', dataInicio)
    .lte('data', dataFim);

  const diasDeAula = new Set<string>(diasAulaData?.map(r => r.data)).size;

  const { count: turmasCount } = await supabase
    .from('turmas')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const { count: aulasDadas } = await supabase
    .from('chamadas_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('data', dataInicio)
    .lte('data', dataFim);

  let diasPrevistos = diasDeAula;
  try {
    const { data: periodosData } = await supabase
      .from('periodos_letivos')
      .select('data')
      .eq('tenant_id', tenantId)
      .gte('data', dataInicio)
      .lte('data', dataFim);
    if (periodosData && periodosData.length > 0) {
      diasPrevistos = new Set<string>(periodosData.map(r => r.data)).size;
    }
  } catch {
    /* periodos_letivos pode não existir ainda */
  }

  const aulasPrevistas = (turmasCount ?? 0) * Math.max(1, diasPrevistos);

  return { diasDeAula, diasPrevistos, aulasDadas: aulasDadas ?? 0, aulasPrevistas };
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

export async function timeline(tenantId: string, filters?: { label?: string; professor_id?: string }): Promise<TimelineData> {
  let turmasQuery = supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.label) turmasQuery = turmasQuery.eq('label', filters.label);
  if (filters?.professor_id) turmasQuery = turmasQuery.eq('professor_id', filters.professor_id);

  const { data: turmas, error: turmasError } = await turmasQuery;
  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, turma_id')
    .eq('tenant_id', tenantId);

  const slots: TimelineSlot[] = [];

  for (const turma of turmas || []) {
    const chave = turma.grupo_id || turma.id;
    const alunosDaTurma = (alunos || []).filter(a => a.turma_id === chave);
    const alunoIds = alunosDaTurma.map(a => a.id);
    if (alunoIds.length === 0) continue;

    const { data: logs } = await supabase
      .from('chamadas_log')
      .select('status')
      .eq('tenant_id', tenantId)
      .in('grupo_id', alunoIds);

    const presentes = logs?.filter(l => l.status === 'presente').length ?? 0;
    const ausentes = logs?.filter(l => l.status === 'falta').length ?? 0;
    const justificados = logs?.filter(l => l.status === 'justificado' || l.status === 'cancelado').length ?? 0;

    slots.push({
      horario: turma.horario,
      presentes,
      ausentes,
      justificados,
      total: logs?.length ?? 0,
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

export async function frequencia(tenantId: string, filters?: { mes?: number; ano?: number; aluno_id?: string }): Promise<FrequenciaData> {
  const { mes, ano, aluno_id } = filters || {};

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

  if (aluno_id) {
    query = query.eq('grupo_id', aluno_id);
  }

  const { data: chamadas, error } = await query.order('data', { ascending: true });
  if (error) throw new AppError('Erro ao buscar frequencia', 500);

  const [alunosResult, turmasResult, professoresResult] = await Promise.all([
    supabase.from('alunos').select('id, nome, nivel, turma_id, ativo').eq('tenant_id', tenantId),
    supabase.from('turmas').select('id, grupo_id, label, nivel, horario, professor_id').eq('tenant_id', tenantId),
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

  const porNivelMap = new Map<string, { total: number; presentes: number }>();
  const porHorarioMap = new Map<string, { total: number; presentes: number }>();
  const porPeriodoMap = new Map<string, { total: number; presentes: number }>();
  const porProfessorMap = new Map<string, { total: number; presentes: number }>();

  const alunosFreq = new Map<string, { nome: string; total: number; presentes: number; justificados: number; faltas: number }>();

  (chamadas || []).forEach((r: any) => {
    const aluno = alunosMap.get(r.grupo_id);
    const turma = aluno ? turmasMap.get(aluno.turma_id) : turmasMap.get(r.grupo_id);

    const nivel = turma?.nivel || aluno?.nivel || 'Sem nivel';
    if (!porNivelMap.has(nivel)) porNivelMap.set(nivel, { total: 0, presentes: 0 });
    const nv = porNivelMap.get(nivel)!;
    nv.total++;
    if (r.status === 'presente') nv.presentes++;

    const horario = turma?.horario || 'Sem horario';
    if (!porHorarioMap.has(horario)) porHorarioMap.set(horario, { total: 0, presentes: 0 });
    const hr = porHorarioMap.get(horario)!;
    hr.total++;
    if (r.status === 'presente') hr.presentes++;

    const periodo = (r.indice_aula ?? 0) < 6 ? 'manhã' : 'tarde';
    if (!porPeriodoMap.has(periodo)) porPeriodoMap.set(periodo, { total: 0, presentes: 0 });
    const pd = porPeriodoMap.get(periodo)!;
    pd.total++;
    if (r.status === 'presente') pd.presentes++;

    const profKey = turma?.professor_id || 'Geral';
    const profNome = professorMap.get(profKey) || profKey;
    if (!porProfessorMap.has(profNome)) porProfessorMap.set(profNome, { total: 0, presentes: 0 });
    const pf = porProfessorMap.get(profNome)!;
    pf.total++;
    if (r.status === 'presente') pf.presentes++;

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
    metrics: { diasDeAula: 0, diasPrevistos: 0, aulasDadas: 0, aulasPrevistas: 0 },
    resumo: { totalRegistros, presentes, faltas, justificados },
    porNivel,
    porHorario,
    porPeriodo,
    porProfessor,
    topAlunos: { topPresenca, topFaltas },
    alunosGrid,
    alunosResumo: { total: totalAlunos, ativos, inativos, retencaoMedia, frequenciaMedia },
  };

  if (mes && ano) {
    const mesStr = String(mes).padStart(2, '0');
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    result.metrics = await calcularMetricasCore(tenantId, `${ano}-${mesStr}-01`, `${ano}-${mesStr}-${ultimoDia}`);
  }

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
          (l: any) => l.grupo_id === aluno_id && l.data >= p.data_inicio && l.data <= (p.data_fim || '2099-12-31')
        );
        const total = logsDoPeriodo.length;
        const presentesPeriodo = logsDoPeriodo.filter((l: any) => l.status === 'presente').length;
        const faltasPeriodo = logsDoPeriodo.filter((l: any) => l.status === 'falta').length;
        const justificadosPeriodo = logsDoPeriodo.filter((l: any) => l.status === 'justificado').length;

        return {
          nivel: turma?.nivel || aluno_id || 'Sem nivel',
          turma_label: turma ? `${turma.nivel || ''} ${turma.horario || ''}`.trim() : 'Turma',
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

export async function cancelamentos(tenantId: string, filters?: { mes?: number; ano?: number }): Promise<CancelamentoDashboard> {
  const { mes, ano } = filters || {};

  let query = supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['justificado', 'cancelado']);

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

  const alunosMap = new Map<string, any>();
  alunosResult.data?.forEach((a: any) => alunosMap.set(a.id, a));

  const turmasMap = new Map<string, any>();
  turmasResult.data?.forEach((t: any) => turmasMap.set(t.grupo_id || t.id, t));

  const professorMap = new Map<string, string>();
  professoresResult?.data?.forEach((p: any) => professorMap.set(p.id, p.nome));

  const porMotivo = new Map<string, number>();
  const porNivelMap = new Map<string, number>();
  const porMesMap = new Map<string, number>();
  const porPeriodoMap = new Map<string, number>();

  for (const r of data || []) {
    const motivo = r.motivo || 'Sem motivo';
    porMotivo.set(motivo, (porMotivo.get(motivo) || 0) + 1);

    const aluno = alunosMap.get(r.grupo_id);
    const turma = aluno ? turmasMap.get(aluno.turma_id) : turmasMap.get(r.grupo_id);
    const nivel = turma?.nivel || aluno?.nivel || 'Sem nivel';
    porNivelMap.set(nivel, (porNivelMap.get(nivel) || 0) + 1);

    const mesKey = r.data ? r.data.substring(0, 7) : 'desconhecido';
    porMesMap.set(mesKey, (porMesMap.get(mesKey) || 0) + 1);

    const periodo = (r.indice_aula ?? 0) < 6 ? 'manhã' : 'tarde';
    porPeriodoMap.set(periodo, (porPeriodoMap.get(periodo) || 0) + 1);
  }

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

export async function exportarCancelamentosCSV(tenantId: string, filters?: { mes?: number; ano?: number }): Promise<string> {
  const result = await cancelamentos(tenantId, filters);
  const linhas = ['data,grupo_id,status,motivo,indice_aula'];
  for (const r of result.registros) {
    linhas.push(`${r.data},${r.grupo_id},${r.status},${r.motivo || ''},${r.indice_aula}`);
  }
  return linhas.join('\n');
}

export async function exportarCancelamentosXLSX(tenantId: string, filters?: { mes?: number; ano?: number }): Promise<Buffer> {
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
