import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import {
  isAllowedTenant,
  isBlockedHost,
  isBlockedTenant,
  isBlockedUrl,
  normalizeHost,
  normalizeTenantId,
} from '../config/tenants';

const DOMAIN_TENANT_MAP: Record<string, string> = {
  'chamadabelavista.pages.dev': 'bela-vista',
  'chamadasaomatheus.pages.dev': 'sao-matheus',
  'chamadavila.pages.dev': 'vila',
  'chamadaparque.pages.dev': 'parque',
  'localhost': 'bela-vista',
  '127.0.0.1': 'bela-vista',
};

const UNIDADE_DESATIVADA = 'A unidade 3ª Idade foi encerrada e não está mais disponível';

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  const origin = req.get('origin') || req.get('referer') || '';

  if (isBlockedUrl(origin)) {
    res.status(403).json({ error: 'Unidade desativada', message: UNIDADE_DESATIVADA });
    return;
  }

  const headerTenant = normalizeTenantId(req.headers['x-tenant-id']);

  if (isBlockedTenant(headerTenant)) {
    res.status(403).json({ error: 'Unidade desativada', message: UNIDADE_DESATIVADA });
    return;
  }

  let tenantId = headerTenant;

  if (!tenantId) {
    const host = normalizeHost(req.get('host'));
    if (isBlockedHost(host)) {
      res.status(403).json({ error: 'Unidade desativada', message: UNIDADE_DESATIVADA });
      return;
    }
    tenantId = DOMAIN_TENANT_MAP[host] || '';
  }

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant não identificado' });
    return;
  }

  if (!isAllowedTenant(tenantId)) {
    res.status(403).json({ error: 'Unidade não autorizada', message: 'Unidade não autorizada ou desativada' });
    return;
  }

  req.tenantId = tenantId;
  next();
}

export default tenantMiddleware;
