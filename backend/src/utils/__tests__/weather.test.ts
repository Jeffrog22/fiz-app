import { fetchWeather, clearWeatherCache } from '../weather';

describe('fetchWeather', () => {
  const TEST_TENANT_ID = 'test-tenant';

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
        json: () => Promise.resolve({ 
          current: { temperature_2m: 25, weather_code: 1 },
          daily: { temperature_2m_max: [30], weather_code: [1] }
        }),
      } as Response),
    );
    const result = await fetchWeather(TEST_TENANT_ID);
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
  });

  it('retorna fallback quando a API falha após todas as tentativas', async () => {
    // Mock all 3 retry attempts to fail
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await fetchWeather(TEST_TENANT_ID);
    expect(result.ok).toBe(false);
    expect(result.raw).toBeNull();
  });
});
