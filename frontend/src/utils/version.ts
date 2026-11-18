export interface VersaoInfo {
  version: string;
}

function numeros(v: string): number[] {
  return (v.trim().replace(/^v/i, '').split('.') || [])
    .map((p) => parseInt(p, 10))
    .filter((n) => !Number.isNaN(n));
}

function versaoValida(v: string): boolean {
  return numeros(v).length > 0;
}

export { versaoValida };

export function compararVersoes(a: string, b: string): number {
  // Versões inválidas ('dev', '', strings não-semver) não disparam atualização
  if (!versaoValida(a) || !versaoValida(b)) return 0;
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
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}
