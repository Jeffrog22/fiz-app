const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

type CacheEntry = {
  data: any;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export async function fetchWeather() {
  const now = Date.now();
  const cached = cache.get('open-meteo');

  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=-23.0300&longitude=-46.9750&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16';

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Falha ao buscar clima');
    const data = await response.json();

    const payload = {
      ok: true,
      raw: data,
    };

    cache.set('open-meteo', { data: payload, expiresAt: now + CACHE_TTL_MS });
    return payload;
  } catch (error) {
    return {
      ok: false,
      raw: null,
    };
  }
}
