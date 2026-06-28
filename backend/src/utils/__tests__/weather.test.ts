import { fetchWeather, clearWeatherCache } from '../weather';

describe('fetchWeather', () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna dados climáticos quando a API responde', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ daily: { temperature_2m_max: [30] } }),
      } as Response),
    );
    const result = await fetchWeather();
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
  });

  it('retorna fallback quando a API falha', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchWeather();
    expect(result.ok).toBe(false);
    expect(result.raw).toBeNull();
  });
});
