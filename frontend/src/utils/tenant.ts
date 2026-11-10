import { getVisitanteSession } from './visitante';

const TENANT_OVERRIDE_KEY = 'tenant_override';

const DOMAIN_TENANT_MAP: Record<string, string> = {
  'chamadabelavista.pages.dev': 'bela-vista',
  'chamadasaomatheus.pages.dev': 'sao-matheus',
  'chamadavila.pages.dev': 'vila',
  'chamadaparque.pages.dev': 'parque',
  'localhost': 'bela-vista',
  '127.0.0.1': 'bela-vista',
};

const BLOCKED_HOSTS = ['chamada3aidade.pages.dev'] as const;
const BLOCKED_TENANT_IDS = ['3aidade'] as const;

const TENANTS = [
  { id: 'bela-vista', nome: 'Bela Vista' },
  { id: 'sao-matheus', nome: 'São Matheus' },
  { id: 'vila', nome: 'Vila' },
  { id: 'parque', nome: 'Parque' },
] as const;

const ALLOWED_TENANT_IDS = new Set<string>(TENANTS.map((t) => t.id));
const BLOCKED_HOSTS_SET = new Set<string>(BLOCKED_HOSTS);
const BLOCKED_TENANT_SET = new Set<string>(BLOCKED_TENANT_IDS);

export function normalizeTenantId(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeTenantHost(host: string | null | undefined): string {
  return typeof host === 'string' ? host.split(':')[0].trim().toLowerCase() : '';
}

export function isAllowedTenant(tenantId: string | null | undefined): boolean {
  return ALLOWED_TENANT_IDS.has(normalizeTenantId(tenantId));
}

export function isBlockedTenant(tenantId: string | null | undefined): boolean {
  return BLOCKED_TENANT_SET.has(normalizeTenantId(tenantId));
}

export function isBlockedHost(host: string = window.location.hostname): boolean {
  return BLOCKED_HOSTS_SET.has(normalizeTenantHost(host));
}

export function getTenantId(): string {
  if (isBlockedHost()) {
    return '';
  }

  const visitante = getVisitanteSession();
  if (visitante && isAllowedTenant(visitante.tenantId)) {
    return visitante.tenantId;
  }

  const override = normalizeTenantId(localStorage.getItem(TENANT_OVERRIDE_KEY));
  if (isAllowedTenant(override)) {
    return override;
  }

  if (localStorage.getItem(TENANT_OVERRIDE_KEY)) {
    localStorage.removeItem(TENANT_OVERRIDE_KEY);
  }

  const host = normalizeTenantHost(window.location.hostname);
  return DOMAIN_TENANT_MAP[host] || 'bela-vista';
}

export function getTenantNome(tenantId: string): string {
  const nomes: Record<string, string> = {
    'bela-vista': 'Bela Vista',
    'sao-matheus': 'São Matheus',
    'vila': 'Vila',
    'parque': 'Parque',
  };
  return nomes[normalizeTenantId(tenantId)] || tenantId;
}

export function getAvailableTenants(): readonly { readonly id: string; readonly nome: string }[] {
  return TENANTS;
}

export function setTenantOverride(tenantId: string): void {
  const normalized = normalizeTenantId(tenantId);
  if (!isAllowedTenant(normalized)) {
    localStorage.removeItem(TENANT_OVERRIDE_KEY);
    return;
  }
  localStorage.setItem(TENANT_OVERRIDE_KEY, normalized);
}

export function clearTenantOverride(): void {
  localStorage.removeItem(TENANT_OVERRIDE_KEY);
}

export function limparDadosLocaisTenantBloqueado(): void {
  const override = localStorage.getItem(TENANT_OVERRIDE_KEY);
  if (override && !isAllowedTenant(override)) {
    localStorage.removeItem(TENANT_OVERRIDE_KEY);
  }

  Object.keys(localStorage).forEach((key) => {
    if (key.toLowerCase().includes('3aidade')) {
      localStorage.removeItem(key);
    }
  });
}

export default getTenantId;
