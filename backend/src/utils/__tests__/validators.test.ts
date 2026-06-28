import { AppError } from '../../middleware/errorHandler';
import { validateProfessorNome, rateLimiter } from '../validators';

function mockReqRes(next: jest.Mock) {
  const req = {
    body: {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  } as any;
  const res = {
    set: jest.fn().mockReturnThis(),
  } as any;
  return { req, res, next };
}

describe('validateProfessorNome', () => {
  it('lança AppError se nome estiver vazio', () => {
    const { req, res, next } = mockReqRes(jest.fn());
    req.body = {};
    expect(() => validateProfessorNome(req, res, next)).toThrow(AppError);
  });

  it('lança AppError se nome não for string', () => {
    const { req, res, next } = mockReqRes(jest.fn());
    req.body = { nome: 123 };
    expect(() => validateProfessorNome(req, res, next)).toThrow(AppError);
  });

  it('chama next() se nome for válido', () => {
    const next = jest.fn();
    const { req, res } = mockReqRes(next);
    req.body = { nome: 'Carlos' };
    validateProfessorNome(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('rateLimiter', () => {
  it('permite requisições dentro do limite', () => {
    const middleware = rateLimiter(60000, 5);
    const next = jest.fn();
    const { req, res } = mockReqRes(next);
    (req as any).ip = '192.168.1.1';

    for (let i = 0; i < 5; i++) {
      middleware(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(5);
  });

  it('bloqueia requisições após exceder o limite', () => {
    const middleware = rateLimiter(60000, 3);
    const next = jest.fn();
    const { req, res } = mockReqRes(next);
    (req as any).ip = '192.168.1.2';

    for (let i = 0; i < 3; i++) {
      middleware(req, res, next);
    }
    expect(() => middleware(req, res, next)).toThrow(AppError);
  });
});
