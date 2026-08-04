const TENANT_OVERRIDE_KEY = 'tenant_override';

const DOMAIN_TENANT_MAP: Record<string, string> = {
  'chamadabelavista.pages.dev': 'bela-vista',
  'chamadasaomatheus.pages.dev': 'sao-matheus',
  'chamadavila.pages.dev': 'vila',
  'chamadaparque.pages.dev': 'parque',
  'chamada3aidade.pages.dev': '3aidade',
  'localhost': 'bela-vista',
  '127.0.0.1': 'bela-vista',
};

const TENANTS = [
  { id: 'bela-vista', nome: 'Bela Vista' },
  { id: 'sao-matheus', nome: 'São Matheus' },
  { id: 'vila', nome: 'Vila' },
  { id: 'parque', nome: 'Parque' },
  { id: '3aidade', nome: '3ª Idade' },
] as const;

export function getTenantId(): string {
  const override = localStorage.getItem(TENANT_OVERRIDE_KEY);
  if (override && TENANTS.some((t) => t.id === override)) {
    return override;
  }
  const host = window.location.hostname;
  return DOMAIN_TENANT_MAP[host] || 'bela-vista';
}

export function getTenantNome(tenantId: string): string {
  const nomes: Record<string, string> = {
    'bela-vista': 'Bela Vista',
    'sao-matheus': 'São Matheus',
    'vila': 'Vila',
    'parque': 'Parque',
    '3aidade': '3ª Idade',
  };
  return nomes[tenantId] || tenantId;
}

export function getAvailableTenants(): readonly { readonly id: string; readonly nome: string }[] {
  return TENANTS;
}

export function setTenantOverride(tenantId: string): void {
  localStorage.setItem(TENANT_OVERRIDE_KEY, tenantId);
}

export function clearTenantOverride(): void {
  localStorage.removeItem(TENANT_OVERRIDE_KEY);
}

export default getTenantId;
