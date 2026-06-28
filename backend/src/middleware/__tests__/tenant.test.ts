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
});
