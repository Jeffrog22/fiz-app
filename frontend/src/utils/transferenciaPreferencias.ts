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
