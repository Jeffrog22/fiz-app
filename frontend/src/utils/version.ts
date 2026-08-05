export interface VersaoInfo {
  versao: string;
}

function numeros(v: string): number[] {
  return (v.trim().replace(/^v/i, '').split('.') || [])
    .map((p) => parseInt(p, 10))
    .filter((n) => !Number.isNaN(n));
}

export function compararVersoes(a: string, b: string): number {
  const na = numeros(a);
  const nb = numeros(b);
  const len = Math.max(na.length, nb.length);
  for (let i = 0; i < len; i++) {
    const da = na[i] ?? 0;
    const db = nb[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

export async function buscarUltimaVersao(): Promise<string | null> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as VersaoInfo;
    return typeof data.versao === 'string' ? data.versao : null;
  } catch {
    return null;
  }
}
