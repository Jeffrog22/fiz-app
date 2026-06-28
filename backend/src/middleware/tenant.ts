import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';

/**
 * Mapeamento de domínios para identificadores de tenant.
 * Cada unidade possui um subdomínio próprio.
 */
const DOMAIN_TENANT_MAP: Record<string, string> = {
  'chamadabelavista.pages.dev': 'bela-vista',
  'chamadasaomatheus.pages.dev': 'sao-matheus',
  'chamadavila.pages.dev': 'vila',
  'chamadaparque.pages.dev': 'parque',
  'localhost': 'bela-vista',
};

/**
 * Middleware de identificação de tenant.
 * 
 * Extrai o tenant_id de uma das seguintes fontes (em ordem de precedência):
 * 1. Header `X-Tenant-ID`
 * 2. Domínio da requisição (mapeado via DOMAIN_TENANT_MAP)
 * 
 * Injeta o tenant_id em `req.tenantId`.
 * Recusa requisições sem tenant válido com HTTP 400.
 */
export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  console.log(`[DEBUG TENANT] headers=${JSON.stringify(req.headers)} host=${req.get('host')}`);
  let tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    const host = req.get('host') || '';
    const domain = host.split(':')[0];
    tenantId = DOMAIN_TENANT_MAP[domain] || null as unknown as string;
    console.log(`[DEBUG TENANT] domain=${domain} mappedTenant=${tenantId}`);
  }

  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant não identificado',
      message: 'Forneça o cabeçalho X-Tenant-ID ou acesse por um domínio válido.',
    });
    return;
  }

  req.tenantId = tenantId;
  next();
}

export default tenantMiddleware;
