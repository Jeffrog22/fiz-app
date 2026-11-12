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

/** Chave por sequência de guia (ex.: 'transferencia-nivel'), unidade e professor. */
function chaveSequencia(sequenciaId: string, professorId: string): string {
  return `tutorial_seq_${sequenciaId}_${getTenantId()}_${professorId}`;
}

/** A sequência de guia já foi concluída ou pulada por este professor nesta unidade? */
export function sequenciaJaVista(sequenciaId: string, professorId: string): boolean {
  return localStorage.getItem(chaveSequencia(sequenciaId, professorId)) === 'true';
}

/** Marca a sequência de guia como vista (concluir ou pular). */
export function marcarSequenciaVista(sequenciaId: string, professorId: string): void {
  localStorage.setItem(chaveSequencia(sequenciaId, professorId), 'true');
}
