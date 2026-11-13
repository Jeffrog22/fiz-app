const PREFIXO = 'tf_';

function chave(tipo: string, tenantId: string, professorId: string): string {
  return `${PREFIXO}${tipo}:${tenantId}:${professorId}`;
}

export function carregarPreferencia<T>(
  tipo: string,
  tenantId: string,
  professorId: string,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(chave(tipo, tenantId, professorId));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function salvarPreferencia(
  tipo: string,
  tenantId: string,
  professorId: string,
  valor: unknown,
): void {
  try {
    localStorage.setItem(chave(tipo, tenantId, professorId), JSON.stringify(valor));
  } catch {
    /* storage indisponível — ignora sem quebrar o fluxo */
  }
}

export default { carregarPreferencia, salvarPreferencia };

/** Estado da programação de transferência pendente (salvo na sessão para restaurar ao voltar do lote). */
export interface ProgramacaoPendente {
  alunoIds: string[];
  professorDestino: string;
  turmaDestino: string;
  dataEfetiva: string;
  motivo: string;
  mudarNivelTurma: boolean;
  nivelTurmaNovo: string;
}

const PROGRAMACAO_PENDENTE_TIPO = 'programacao_pendente';

function chaveProgramacao(tenantId: string, professorId: string): string {
  return `${PREFIXO}${PROGRAMACAO_PENDENTE_TIPO}:${tenantId}:${professorId}`;
}

/** Salva o estado atual da programação no sessionStorage (expira ao fechar a aba). */
export function salvarProgramacaoPendente(
  tenantId: string,
  professorId: string,
  valor: ProgramacaoPendente,
): void {
  try {
    sessionStorage.setItem(chaveProgramacao(tenantId, professorId), JSON.stringify(valor));
  } catch {
    /* storage indisponível — ignora sem quebrar o fluxo */
  }
}

/** Carrega e remove o estado de programação pendente da sessão. */
export function carregarProgramacaoPendente(
  tenantId: string,
  professorId: string,
): ProgramacaoPendente | null {
  try {
    const raw = sessionStorage.getItem(chaveProgramacao(tenantId, professorId));
    if (!raw) return null;
    return JSON.parse(raw) as ProgramacaoPendente;
  } catch {
    return null;
  }
}

/** Remove o estado de programação pendente da sessão. */
export function limparProgramacaoPendente(tenantId: string, professorId: string): void {
  try {
    sessionStorage.removeItem(chaveProgramacao(tenantId, professorId));
  } catch {
    /* ignora */
  }
}
