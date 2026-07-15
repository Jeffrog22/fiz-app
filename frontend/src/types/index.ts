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

export interface Exclusao {
  id: string;
  aluno_id: string;
  motivo: string;
  data_exclusao: string;
  oculto: boolean;
  alunos: {
    id: string;
    nome: string;
    turma_id?: string;
    nivel?: string;
    contato?: string;
    ativo: boolean;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  professorId?: string;
  professorNome?: string;
  tenantId?: string;
  loading: boolean;
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

// --- Reports ---

export interface FrequenciaAlunoItem {
  aluno_id: string;
  nome: string;
  turma_label?: string;
  professor?: string;
  presente: number;
  falta: number;
  justificado: number;
  cancelado: number;
  total_aulas: number;
  percentual_presenca: number;
}

export interface FrequenciaTurmaItem {
  grupo_id: string;
  label: string;
  horario: string;
  professor: string;
  professor_id: string;
  nivel: string;
  presente: number;
  falta: number;
  justificado: number;
  cancelado: number;
  total_aulas: number;
  percentual_presenca: number;
}

export interface RotatividadeItem {
  mes: number;
  matricula_inicial: number;
  correcao: number;
  transferencia: number;
  total: number;
}

export interface ExclusaoStatsItem {
  motivo: string;
  total: number;
  percentual: number;
}

export interface CancelamentoItem {
  motivo: string;
  total: number;
  percentual: number;
}

export interface CancelamentoRegistro {
  data: string;
  motivo: string;
  grupo_id: string;
  turma_label?: string;
  horario?: string;
  professor?: string;
  tipo_select?: string;
}

export interface CancelamentoData {
  total: number;
  porMotivo: CancelamentoItem[];
  porMes: { mes: number; total: number }[];
  registros?: CancelamentoRegistro[];
}

export interface PiscinaRegistro {
  data: string;
  temperatura_piscina?: number;
  temperatura_externa?: number;
  cloro_ppm?: number;
  condicao_clima?: string;
}

export interface PiscinaHistoricoData {
  registros: PiscinaRegistro[];
  medias: {
    temperatura_piscina: number;
    temperatura_externa: number;
    cloro_ppm: number;
  };
  dias_frios: number;
}

export interface DemograficoItem {
  label: string;
  total: number;
  percentual: number;
}

export interface DemograficoData {
  total: number;
  media_idade: number;
  porCategoria: DemograficoItem[];
  porGenero: DemograficoItem[];
}

export interface OcupacaoTurmaItem {
  grupo_id: string;
  label: string;
  horario: string;
  professor: string;
  nivel?: string;
  capacidade: number;
  ocupacao: number;
  percentual: number;
}

export interface OcupacaoData {
  turmas: OcupacaoTurmaItem[];
  total_capacidade: number;
  total_ativos: number;
}

export interface Planejamento {
  id: string;
  tipo: string;
  ano: number;
  total_blocos: number;
  nome_original: string;
  nome_arquivo: string;
  tamanho: number;
  tipo_mime: string;
  criado_em: string;
}

export interface PlanejamentoBloco {
  id: string;
  planejamento_id: string;
  indice: number;
  tipo: string;
  ano: number;
  conteudo?: string;
  criado_em: string;
}
