import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth';

const JWT_SECRET = 'dev-secret';

function mockReqRes(headers: Record<string, string>, cookies?: Record<string, string>) {
  const req = {
    cookies: cookies || {},
    headers,
    tenantId: headers['x-tenant-id'] || undefined,
  } as any;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe('authMiddleware', () => {
  it('retorna 401 se token não for fornecido', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({});
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token de autenticação não fornecido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 se token for inválido', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes({}, { token: 'token-invalido' });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 se tenant do token não corresponder', () => {
    const next = jest.fn();
    const token = jwt.sign(
      { professorId: 'abc', tenantId: 'outro-tenant', nome: 'Teste' },
      JWT_SECRET,
    );
    const { req, res } = mockReqRes({ 'x-tenant-id': 'bela-vista' }, { token });
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() se token for válido e tenant corresponder', () => {
    const next = jest.fn();
    const token = jwt.sign(
      { professorId: 'abc', tenantId: 'bela-vista', nome: 'Teste' },
      JWT_SECRET,
    );
    const { req, res } = mockReqRes({ 'x-tenant-id': 'bela-vista' }, { token });
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.professorId).toBe('abc');
  });
});
