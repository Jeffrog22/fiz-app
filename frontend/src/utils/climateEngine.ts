export interface Sugestao {
  status: 'AULA_NORMAL' | 'FALTA_JUSTIFICADA';
  motivo: string | null;
}

const WMO_VETO_ABSOLUTO = new Set([
  3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
  71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]);

const WMO_DINAMICO = new Set([0, 1, 2]);

export const WMO_MAP: Record<number, string> = {
  0: 'céu limpo',
  1: 'principalmente limpo',
  2: 'parcialmente nublado',
  3: 'nublado (encoberto)',
  45: 'névoa seca',
  48: 'nevoeiro/geada',
  51: 'chuvisco',
  53: 'chuvisco constante',
  55: 'chuvisco constante',
  56: 'chuvisco congelante',
  57: 'chuvisco congelante',
  61: 'chuva fraca',
  63: 'chuva moderada',
  65: 'chuva forte',
  66: 'chuva congelante',
  67: 'chuva congelante',
  71: 'neve fraca',
  73: 'neve moderada',
  75: 'neve forte',
  77: 'grãos de neve',
  80: 'pancadas de chuva fraca',
  81: 'pancadas de chuva moderada',
  82: 'pancadas de chuva violentas',
  85: 'pancadas de neve fracas',
  86: 'pancadas de neve fortes',
  95: 'tempestade',
  96: 'tempestade com granizo',
  99: 'tempestade com granizo',
};

export function getCondicaoFromWeatherCode(code: number | null): string {
  if (code === null || code === undefined || WMO_MAP[code] === undefined) {
    return 'Parcialmente Nublado';
  }
  return WMO_MAP[code];
}

export function getSensacoesFromTemperatura(temp: number): string[] {
  if (temp < 10) return ['Frio'];
  if (temp < 15) return ['Frio'];
  return [];
}

function getWeatherCode(condicao: string): number {
  const map: Record<string, number> = {
    'céu limpo': 0,
    'principalmente limpo': 1,
    'parcialmente nublado': 2,
    'nublado': 3,
    'nublado (encoberto)': 3,
    'névoa seca': 45,
    'nevoeiro/geada': 48,
    'chuvisco': 51,
    'chuvisco constante': 53,
    'chuva fraca': 61,
    'chuva moderada': 63,
    'chuva forte': 65,
    'chuva': 61,
    'pancadas de chuva fraca': 80,
    'pancadas de chuva moderada': 81,
    'pancadas de chuva violentas': 82,
    'tempestade': 95,
    'tempestade com granizo': 96,
  };
  const chave = condicao.toLowerCase().trim();
  return map[chave] ?? -1;
}

export function getClimaSugestao(condicao: string, sensacoes: string[]): Sugestao {
  if (sensacoes.includes('Frio') || sensacoes.includes('Frio Intenso')) {
    return { status: 'FALTA_JUSTIFICADA', motivo: sensacoes.includes('Frio Intenso') ? 'Frio Intenso' : 'Frio' };
  }

  const code = getWeatherCode(condicao);

  if (WMO_VETO_ABSOLUTO.has(code)) {
    return { status: 'FALTA_JUSTIFICADA', motivo: condicao };
  }

  if (WMO_DINAMICO.has(code)) {
    const sensacoesNaoPermitidas = ['Frio', 'Vento', 'Frio Intenso'];
    if (sensacoes.some((s) => sensacoesNaoPermitidas.includes(s))) {
      return { status: 'FALTA_JUSTIFICADA', motivo: 'Condição climática desfavorável' };
    }
  }

  return { status: 'AULA_NORMAL', motivo: null };
}

export function getTempPiscinaSugestao(temp: number): Sugestao {
  if (temp < 26) {
    return { status: 'FALTA_JUSTIFICADA', motivo: 'Água muito fria' };
  }
  if (temp < 28) {
    return { status: 'FALTA_JUSTIFICADA', motivo: 'Água fria' };
  }
  return { status: 'AULA_NORMAL', motivo: null };
}

export function getCloroSugestao(cloro: number): Sugestao {
  if (cloro < 1 || cloro > 5) {
    return { status: 'FALTA_JUSTIFICADA', motivo: 'Parâmetros de Cloro Inadequados' };
  }
  return { status: 'AULA_NORMAL', motivo: null };
}

export function getSugestaoFinal(
  clima: Sugestao,
  piscina: Sugestao,
  cloro: Sugestao,
): Sugestao {
  if (clima.status === 'FALTA_JUSTIFICADA') return clima;
  if (piscina.status === 'FALTA_JUSTIFICADA') return piscina;
  if (cloro.status === 'FALTA_JUSTIFICADA') return cloro;
  return { status: 'AULA_NORMAL', motivo: null };
}
