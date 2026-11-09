import {
  ALLOWED_TENANTS,
  isAllowedTenant,
  isBlockedHost,
  isBlockedOrigin,
  isBlockedTenant,
  isBlockedUrl,
  normalizeHost,
  normalizeOrigin,
  normalizeTenantId,
} from '../tenants';

describe('config/tenants', () => {
  it('mantém exatamente as 4 unidades ativas', () => {
    expect(ALLOWED_TENANTS).toEqual(['bela-vista', 'sao-matheus', 'vila', 'parque']);
  });

  it('aceita apenas a whitelist de unidades', () => {
    for (const tenant of ALLOWED_TENANTS) {
      expect(isAllowedTenant(tenant)).toBe(true);
    }
    expect(isAllowedTenant('3aidade')).toBe(false);
    expect(isAllowedTenant('outro-tenant')).toBe(false);
    expect(isAllowedTenant('')).toBe(false);
    expect(isAllowedTenant(undefined)).toBe(false);
  });

  it('identifica a unidade desativada', () => {
    expect(isBlockedTenant('3aidade')).toBe(true);
    expect(isBlockedTenant(' 3AIDADE ')).toBe(true);
    expect(isBlockedTenant('bela-vista')).toBe(false);
  });

  it('normaliza tenant, host e origin', () => {
    expect(normalizeTenantId('  Bela-Vista ')).toBe('bela-vista');
    expect(normalizeHost('ChamadaBelaVista.pages.dev:443')).toBe('chamadabelavista.pages.dev');
    expect(normalizeOrigin('https://chamada3aidade.pages.dev/')).toBe('https://chamada3aidade.pages.dev');
  });

  it('bloqueia host e origin do domínio antigo', () => {
    expect(isBlockedHost('chamada3aidade.pages.dev')).toBe(true);
    expect(isBlockedHost('CHAMADA3AIDADE.PAGES.DEV')).toBe(true);
    expect(isBlockedHost('chamadabelavista.pages.dev')).toBe(false);
    expect(isBlockedOrigin('https://chamada3aidade.pages.dev')).toBe(true);
    expect(isBlockedOrigin('https://chamadabelavista.pages.dev')).toBe(false);
  });

  it('bloqueia URL completa (referer) do domínio antigo', () => {
    expect(isBlockedUrl('https://chamada3aidade.pages.dev/login')).toBe(true);
    expect(isBlockedUrl('https://chamadabelavista.pages.dev/login')).toBe(false);
    expect(isBlockedUrl('')).toBe(false);
    expect(isBlockedUrl(undefined)).toBe(false);
  });
});
