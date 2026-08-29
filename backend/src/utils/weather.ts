import { supabase } from '../services/supabaseClient';

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 2000;

interface OpenMeteoResponse {
  current?: {
    time: string;
    interval: number;
    temperature_2m: number;
    weather_code: number;
    is_day: number;
    precipitation: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

type CacheEntry = {
  data: any;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function clearWeatherCache(): void {
  cache.clear();
}

interface LogClimaDados {
  tenantId: string;
  tentativas: number;
  duracaoTotalMs: number;
  sucesso: boolean;
  cacheHit: boolean;
  erro?: string;
  temperatura?: number;
  weatherCode?: number;
}

async function registrarLogClima(dados: LogClimaDados): Promise<void> {
  try {
    await supabase.from('logs_clima').insert({
      tenant_id: dados.tenantId,
      tentativas: dados.tentativas,
      duracao_total_ms: dados.duracaoTotalMs,
      sucesso: dados.sucesso,
      cache_hit: dados.cacheHit,
      erro: dados.erro ?? null,
      temperatura: dados.temperatura ?? null,
      weather_code: dados.weatherCode ?? null,
    });
  } catch (error) {
    console.error('[weather] erro ao registrar log de clima:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * 100) - 50;
}

export async function fetchWeather(tenantId: string) {
  const inicioTotal = Date.now();
  const cacheKey = 'open-meteo';

  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now < cached.expiresAt) {
    await registrarLogClima({
      tenantId,
      tentativas: 1,
      duracaoTotalMs: Date.now() - inicioTotal,
      sucesso: true,
      cacheHit: true,
      temperatura: cached.data.raw?.current?.temperature_2m ?? cached.data.raw?.daily?.temperature_2m_max?.[0],
      weatherCode: cached.data.raw?.current?.weather_code ?? cached.data.raw?.daily?.weather_code?.[0],
    });
    return cached.data;
  }

  let ultimoErro: Error | null = null;
  let tentativas = 0;

  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    tentativas = tentativa;
    const inicioTentativa = Date.now();

    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?latitude=-23.0300&longitude=-46.9750&current=temperature_2m,weather_code,is_day,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16';

      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as OpenMeteoResponse;

      const payload = {
        ok: true,
        raw: data,
      };

      cache.set(cacheKey, { data: payload, expiresAt: now + CACHE_TTL_MS });

      const temperaturaAtual = data.current?.temperature_2m ?? data.daily?.temperature_2m_max?.[0];
      const weatherCodeAtual = data.current?.weather_code ?? data.daily?.weather_code?.[0];

      await registrarLogClima({
        tenantId,
        tentativas,
        duracaoTotalMs: Date.now() - inicioTotal,
        sucesso: true,
        cacheHit: false,
        temperatura: temperaturaAtual,
        weatherCode: weatherCodeAtual,
      });

      return payload;
    } catch (error) {
      ultimoErro = error instanceof Error ? error : new Error(String(error));
      const duracaoTentativa = Date.now() - inicioTentativa;

      console.warn(`[weather] Tentativa ${tentativa}/${MAX_RETRIES} falhou (${duracaoTentativa}ms):`, ultimoErro.message);

      if (tentativa < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, tentativa - 1), MAX_DELAY_MS);
        await sleep(jitter(delay));
      }
    }
  }

  await registrarLogClima({
    tenantId,
    tentativas,
    duracaoTotalMs: Date.now() - inicioTotal,
    sucesso: false,
    cacheHit: false,
    erro: ultimoErro?.message ?? 'Erro desconhecido',
  });

  return {
    ok: false,
    raw: null,
  };
}