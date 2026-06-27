/**
 * Mapeamento de domínios para identificadores de tenant no frontend.
 */
const DOMAIN_TENANT_MAP: Record<string, string> = {
  'chamadabelavista.pages.dev': 'bela-vista',
  'chamadasaomatheus.pages.dev': 'sao-matheus',
  'chamadavila.pages.dev': 'vila',
  'chamadaparque.pages.dev': 'parque',
  'localhost': 'bela-vista',
  '127.0.0.1': 'bela-vista',
};

/**
 * Extrai o identificador do tenant a partir do hostname da janela.
 * Utilizado para identificar qual unidade está acessando o sistema.
 * 
 * @returns {string} Identificador do tenant (ex: 'bela-vista', 'sao-matheus')
 */
export function getTenantId(): string {
  const host = window.location.hostname;
  return DOMAIN_TENANT_MAP[host] || 'bela-vista';
}

/**
 * Retorna o nome amigável da unidade baseado no tenant ID.
 */
export function getTenantNome(tenantId: string): string {
  const nomes: Record<string, string> = {
    'bela-vista': 'Bela Vista',
    'sao-matheus': 'São Matheus',
    'vila': 'Vila',
    'parque': 'Parque',
  };
  return nomes[tenantId] || tenantId;
}

export default getTenantId;
