import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAvailableTenants,
  getTenantId,
  getTenantNome,
  isAllowedTenant,
  isBlockedHost,
  isBlockedTenant,
  limparDadosLocaisTenantBloqueado,
  setTenantOverride,
} from '../tenant';

describe('utils/tenant', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mantém apenas as 4 unidades ativas', () => {
    const tenants = getAvailableTenants();
    expect(tenants.map((t) => t.id)).toEqual(['bela-vista', 'sao-matheus', 'vila', 'parque']);
    expect(tenants.some((t) => t.id === '3aidade')).toBe(false);
  });

  it('valida a whitelist de unidades', () => {
    expect(isAllowedTenant('bela-vista')).toBe(true);
    expect(isAllowedTenant('  PARQUE ')).toBe(true);
    expect(isAllowedTenant('3aidade')).toBe(false);
    expect(isAllowedTenant('outro-tenant')).toBe(false);
    expect(isBlockedTenant('3aidade')).toBe(true);
  });

  it('identifica o domínio antigo como bloqueado', () => {
    expect(isBlockedHost('chamada3aidade.pages.dev')).toBe(true);
    expect(isBlockedHost('CHAMADA3AIDADE.PAGES.DEV')).toBe(true);
    expect(isBlockedHost('chamadabelavista.pages.dev')).toBe(false);
  });

  it('usa bela-vista como padrão em localhost', () => {
    expect(getTenantId()).toBe('bela-vista');
  });

  it('respeita override de unidade ativa', () => {
    setTenantOverride('parque');
    expect(localStorage.getItem('tenant_override')).toBe('parque');
    expect(getTenantId()).toBe('parque');
  });

  it('ignora e remove override da unidade desativada', () => {
    localStorage.setItem('tenant_override', '3aidade');
    expect(getTenantId()).toBe('bela-vista');
    expect(localStorage.getItem('tenant_override')).toBeNull();
  });

  it('não grava override de unidade inválida', () => {
    setTenantOverride('3aidade');
    expect(localStorage.getItem('tenant_override')).toBeNull();
  });

  it('não expõe nome amigável para a unidade desativada', () => {
    expect(getTenantNome('3aidade')).toBe('3aidade');
    expect(getTenantNome('parque')).toBe('Parque');
  });

  it('limpa chaves locais residuais da 3aidade', () => {
    localStorage.setItem('tenant_override', '3aidade');
    localStorage.setItem('3aidade_professor', '{}');
    localStorage.setItem('tutorial_tour_3aidade_jeff', '1');
    localStorage.setItem('tenant_override_valido', 'parque');

    limparDadosLocaisTenantBloqueado();

    expect(localStorage.getItem('tenant_override')).toBeNull();
    expect(localStorage.getItem('3aidade_professor')).toBeNull();
    expect(localStorage.getItem('tutorial_tour_3aidade_jeff')).toBeNull();
    expect(localStorage.getItem('tenant_override_valido')).toBe('parque');
  });
});
