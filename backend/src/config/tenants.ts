export const ALLOWED_TENANTS = ['bela-vista', 'sao-matheus', 'vila', 'parque'] as const;
export type AllowedTenant = (typeof ALLOWED_TENANTS)[number];

export const BLOCKED_TENANTS = ['3aidade'] as const;

export const BLOCKED_HOSTS = ['chamada3aidade.pages.dev'] as const;

export const BLOCKED_ORIGINS = ['https://chamada3aidade.pages.dev'] as const;

const ALLOWED_TENANTS_SET = new Set<string>(ALLOWED_TENANTS);
const BLOCKED_TENANTS_SET = new Set<string>(BLOCKED_TENANTS);
const BLOCKED_HOSTS_SET = new Set<string>(BLOCKED_HOSTS);
const BLOCKED_ORIGINS_SET = new Set<string>(BLOCKED_ORIGINS);

export function normalizeTenantId(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeHost(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.split(':')[0].trim().toLowerCase();
}

export function normalizeOrigin(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

export function isAllowedTenant(tenantId: unknown): boolean {
  return ALLOWED_TENANTS_SET.has(normalizeTenantId(tenantId));
}

export function isBlockedTenant(tenantId: unknown): boolean {
  return BLOCKED_TENANTS_SET.has(normalizeTenantId(tenantId));
}

export function isBlockedHost(host: unknown): boolean {
  return BLOCKED_HOSTS_SET.has(normalizeHost(host));
}

export function isBlockedOrigin(origin: unknown): boolean {
  return BLOCKED_ORIGINS_SET.has(normalizeOrigin(origin));
}

export function isBlockedUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (isBlockedOrigin(value)) return true;
  try {
    return isBlockedHost(new URL(value).hostname);
  } catch {
    return false;
  }
}
