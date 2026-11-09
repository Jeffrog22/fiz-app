import { tenantMiddleware } from '../tenant';
import { AppError } from '../errorHandler';

describe('tenantMiddleware', () => {
  function mockReqRes(headers: Record<string, string>, host?: string) {
    const req = {
      get: jest.fn((key: string) => {
        if (key === 'host') return host || 'unknown.example.com';
        return headers[key] || undefined;
      }),
      headers,
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;
    return { req, res };
  }

  it('extrai tenantId do header X-Tenant-ID', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({ 'x-tenant-id': 'bela-vista' });
    tenantMiddleware(req, res, next);
    expect(req.tenantId).toBe('bela-vista');
    expect(next).toHaveBeenCalled();
  });

  it('retorna 400 se X-Tenant-ID estiver ausente', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({});
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 400 se X-Tenant-ID for inválido', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({ 'x-tenant-id': '' });
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 se X-Tenant-ID for a unidade desativada 3aidade', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({ 'x-tenant-id': '3aidade' });
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 para tenant desconhecido (whitelist)', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({ 'x-tenant-id': 'outro-tenant' });
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 para Origin do dominio antigo da 3aidade', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({
      'x-tenant-id': 'bela-vista',
      origin: 'https://chamada3aidade.pages.dev',
    });
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 para Referer de rota no dominio antigo da 3aidade', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({
      'x-tenant-id': 'bela-vista',
      referer: 'https://chamada3aidade.pages.dev/login',
    });
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o Host e o dominio antigo da 3aidade', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({}, 'chamada3aidade.pages.dev');
    tenantMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('extrai tenant do dominio valido quando nao ha header', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({}, 'chamadabelavista.pages.dev');
    tenantMiddleware(req, res, next);
    expect(req.tenantId).toBe('bela-vista');
    expect(next).toHaveBeenCalled();
  });

  it('normaliza X-Tenant-ID com espacos e maiusculas', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({ 'x-tenant-id': '  Bela-Vista  ' });
    tenantMiddleware(req, res, next);
    expect(req.tenantId).toBe('bela-vista');
    expect(next).toHaveBeenCalled();
  });
});
