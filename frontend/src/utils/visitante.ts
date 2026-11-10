import { isTokenExpirado } from './jwt';

const VISITANTE_KEY = 'fiz_visitante';

export interface VisitanteSession {
  token: string;
  tenantId: string;
  nome: string;
  isVisitante: true;
}

export function getVisitanteSessionBruta(): VisitanteSession | null {
  try {
    const raw = sessionStorage.getItem(VISITANTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.tenantId || parsed.isVisitante !== true) return null;
    return parsed as VisitanteSession;
  } catch {
    return null;
  }
}

export function getVisitanteSession(): VisitanteSession | null {
  const sessao = getVisitanteSessionBruta();
  if (!sessao) return null;
  if (isTokenExpirado(sessao.token)) return null;
  return sessao;
}

export function setVisitanteSession(sessao: VisitanteSession): void {
  sessionStorage.setItem(VISITANTE_KEY, JSON.stringify(sessao));
}

export function clearVisitanteSession(): void {
  sessionStorage.removeItem(VISITANTE_KEY);
}

export function isVisitanteAtivo(): boolean {
  return getVisitanteSession() !== null;
}
