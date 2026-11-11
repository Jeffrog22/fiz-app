import { normalizeSearch } from './formatters';
import type { BlocoDeNotas } from '../types';

export type FiltroBloco = 'todas' | 'textos' | 'listas';

export function filtrarNotas(
  notas: BlocoDeNotas[],
  busca: string,
  filtro: FiltroBloco,
): BlocoDeNotas[] {
  const buscaNormalizada = normalizeSearch(busca);
  return notas.filter((n) => {
    if (filtro === 'textos' && n.tipo !== 'texto') return false;
    if (filtro === 'listas' && n.tipo !== 'lista') return false;
    if (!buscaNormalizada) return true;
    const campos = [n.titulo, n.conteudo, ...n.itens.map((i) => i.texto)].join(' ');
    return normalizeSearch(campos).includes(buscaNormalizada);
  });
}
