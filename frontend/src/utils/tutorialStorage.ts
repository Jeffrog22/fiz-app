import { getTenantId } from './tenant';

function chave(tipo: 'tour' | 'versao', professorId: string): string {
  return `tutorial_${tipo}_${getTenantId()}_${professorId}`;
}

export function tourJaVisto(professorId: string): boolean {
  return localStorage.getItem(chave('tour', professorId)) === 'true';
}

export function marcarTourVisto(professorId: string): void {
  localStorage.setItem(chave('tour', professorId), 'true');
}

export function getUltimaVersaoVista(professorId: string): string | null {
  return localStorage.getItem(chave('versao', professorId));
}

export function setUltimaVersaoVista(professorId: string, versao: string): void {
  localStorage.setItem(chave('versao', professorId), versao);
}
