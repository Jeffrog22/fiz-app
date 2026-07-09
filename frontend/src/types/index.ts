// Tipos compartilhados do frontend

export interface Professor {
  id: string;
  tenant_id: string;
  nome: string;
  hash: string;
  criado_em: string;
}

export interface Aluno {
  id: string;
  tenant_id: string;
  nome: string;
  data_nascimento?: string;
  genero?: string;
  contato?: string;
  ativo: boolean;
  par_q?: boolean;
  atestado_medico?: boolean;
  data_atestado?: string;
  turma_id?: string;
  nivel?: string;
  categoria?: string;
  turma?: Turma;
  criado_em: string;
}

export interface Turma {
  id: string;
  tenant_id: string;
  label: string;
  horario: string;
  professor_id?: string;
  nivel?: string;
  capacidade?: number;
  faixa_etaria?: string;
  grupo_id?: string;
  alunos_count?: number;
  criado_em: string;
}

export interface ChamadaLog {
  id: string;
  tenant_id: string;
  data: string;
  grupo_id?: string;
  indice_aula: number;
  status?: 'presente' | 'falta' | 'justificado' | 'cancelado' | 'feriado' | 'ponte' | 'reuniao' | 'evento';
  motivo?: string;
  condicao_clima?: string;
  temperatura_ext?: number;
  temperatura_piscina?: number;
  cloro_ppm?: number;
  tipo_select?: 'geral' | 'pessoal';
  tipo_ocorrencia?: string;
  origem?: 'manual' | 'extrapolado';
  criado_em: string;
}

export interface EnrollmentPeriod {
  id: string;
  tenant_id: string;
  aluno_id: string;
  turma_id?: string;
  nivel?: string;
  data_inicio: string;
  data_fim?: string;
  motivo: 'matricula_inicial' | 'correcao' | 'transferencia';
  criado_em: string;
}

export interface SavePayload {
  data: Partial<Aluno>;
  acao?: 'correcao' | 'transferencia';
}

export interface AnotacaoAluno {
  id: string;
  tenant_id: string;
  aluno_id: string;
  anotacao: string;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface CalendarioEvento {
  id: string;
  data: string;
  tipo: 'feriado' | 'ponte' | 'reuniao' | 'evento';
  descricao?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  professorId?: string;
  professorNome?: string;
  tenantId?: string;
  loading: boolean;
}

// --- Relatórios ---

export interface MetricasPorLabel {
  label: string;
  semanas: number;
  turmas: number;
  previsto: number;
  concluido: number;
}

export interface FrequencyMetrics {
  diasConcluidos: number;
  diasPrevistos: number;
  aulasDadas: number;
  aulasPrevistas: number;
  porLabel: MetricasPorLabel[];
}

export interface FrequenciaPorNivel { nivel: string; percentual: number; total: number; }
export interface FrequenciaPorHorario { horario: string; percentual: number; }
export interface FrequenciaPorPeriodo { periodo: string; percentual: number; }
export interface FrequenciaPorProfessor { professor: string; percentual: number; }

export interface TopAlunoFrequencia {
  id: string; nome: string; presencas: number; total: number; taxa: number;
}
export interface TopAlunoFalta {
  id: string; nome: string; faltas: number;
}

export interface AlunoFrequenciaGrid {
  id: string; nome: string; ativo: boolean;
  presencas: number; justificativas: number; faltas: number; total: number; taxa: number;
}

export interface EnrollmentPeriodHistorico {
  nivel: string; turma_label: string;
  data_inicio: string; data_fim?: string;
  permanenciaDias: number; total: number; presentes: number; faltas: number; justificados: number; assiduidade: number;
}

export interface RetencaoAluno {
  totalDias: number; diasDesdeInicio: number; percentual: number;
}

export interface FrequenciaData {
  metrics: FrequencyMetrics;
  resumo: { totalRegistros: number; presentes: number; faltas: number; justificados: number };
  porNivel: FrequenciaPorNivel[];
  porHorario: FrequenciaPorHorario[];
  porPeriodo: FrequenciaPorPeriodo[];
  porProfessor: FrequenciaPorProfessor[];
  topAlunos: { topPresenca: TopAlunoFrequencia[]; topFaltas: TopAlunoFalta[] };
  alunosGrid: AlunoFrequenciaGrid[];
  alunosResumo: { total: number; ativos: number; inativos: number; retencaoMedia: number; frequenciaMedia: number };
  enrollmentPeriods?: EnrollmentPeriodHistorico[];
  retencao?: RetencaoAluno;
  timeline?: TimelineData;
}

export interface TimelineSlot {
  horario: string;
  presentes: number;
  ausentes: number;
  justificados: number;
  total: number;
}

export interface TimelineData {
  horarios: string[];
  slots: TimelineSlot[];
  labels: string[];
  professores: { id: string; nome: string }[];
}

export interface CancelamentoDashboard {
  total: number;
  motivoFrequente: { motivo: string; count: number };
  nivelCritico: { nivel: string; count: number };
  mesCritico: { mes: string; count: number };
  evolucaoMensal: { mes: string; total: number }[];
  distribuicaoMotivo: { motivo: string; total: number; cor: string }[];
  porNivel: { nivel: string; total: number }[];
  porPeriodo: { periodo: string; total: number }[];
  registros: any[];
}

export interface ControleMensalRow {
  horario: string;
  dadas: number;
  previstas: number;
}

export interface ControleMensalLabel {
  label: string;
  professor: string;
  horarios: ControleMensalRow[];
  totalDadas: number;
  totalPrevistas: number;
}

export interface TurmaExportRow {
  horario: string; nivel: string; selecionado: boolean;
}

export interface VagaExportRow {
  horario: string; label: string; professor: string;
  nivel: string; lotacaoGrupo: string; lotacaoHorario: string;
  status: 'vaga' | 'lotada'; vagas: number;
}

// --- Vagas ---

export interface VagaGrupo {
  grupo_id: string;
  nivel: string;
  professor: string;
  capacidade: number;
  alunos_ativos: number;
  vagas: number;
  excedente: number;
}

export interface VagaHorario {
  horario: string;
  label: string;
  total_capacidade: number;
  total_ativos: number;
  total_vagas: number;
  total_excedente: number;
  grupos: VagaGrupo[];
}

export interface VagasResponse {
  totais: {
    capacidade: number;
    ativos: number;
    vagas: number;
    excedente: number;
  };
  horarios: VagaHorario[];
}
