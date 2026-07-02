import { Request } from 'express';

// Extensão do Request do Express para incluir tenantId
export interface TenantRequest extends Request {
  tenantId?: string;
  professorId?: string;
}

// Types do banco de dados
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
  status?: 'presente' | 'falta' | 'justificado' | 'cancelado';
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

export interface JwtPayload {
  professorId: string;
  tenantId: string;
  nome: string;
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

export interface LogAcesso {
  id: string;
  timestamp: string;
  professor: string;
  unidade: string;
  status: 'sucesso' | 'falha';
  ip: string;
}
