import { compararVersoes } from './version';
import type { GuiaVisual, TipoGuia } from '../data/guiaVisual';

/** Versão do app em execução (definida no build). */
export function versaoAtualApp(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
}

export function guiaPorId(guias: GuiaVisual[], id: string): GuiaVisual | null {
  return guias.find((g) => g.id === id) ?? null;
}

/** O guia descreve uma versão já instalada (ou anterior)? */
export function guiaElegivel(guia: GuiaVisual | null, versaoAtual: string): boolean {
  if (!guia || !versaoAtual) return false;
  return compararVersoes(guia.versao, versaoAtual) <= 0;
}

/** Guias de um tipo, ordenados da versão mais antiga para a mais nova. */
export function guiasDoTipo(
  guias: GuiaVisual[],
  tipo: TipoGuia,
  versaoAtual: string,
): GuiaVisual[] {
  return guias
    .filter((g) => g.tipo === tipo && guiaElegivel(g, versaoAtual))
    .sort((a, b) => compararVersoes(a.versao, b.versao));
}

/** Guia mais recente elegível de um tipo. */
export function guiaDeTipo(
  guias: GuiaVisual[],
  tipo: TipoGuia,
  versaoAtual: string,
): GuiaVisual | null {
  const lista = guiasDoTipo(guias, tipo, versaoAtual);
  return lista.length > 0 ? lista[lista.length - 1] : null;
}

/** Deve exibir a entrada discreta "Veja o que mudou" na Home? */
export function deveMostrarGuiaNovidades(
  guia: GuiaVisual | null,
  jaVisto: boolean,
): boolean {
  return !!guia && !jaVisto;
}
