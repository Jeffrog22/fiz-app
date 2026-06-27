import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Valida se o nome do professor está preenchido.
 */
export function validateProfessorNome(req: TenantRequest, res: Response, next: NextFunction): void {
  const { nome } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
    throw new AppError('Preencha o nome do professor', 400);
  }

  next();
}

/**
 * Valida se o arquivo CSV foi enviado no formato multipart/form-data.
 */
export function validateCsvUpload(req: TenantRequest, res: Response, next: NextFunction): void {
  // Em middleware, não temos acesso direto ao file se não usarmos multer
  // Essa validação será feita no controller após o upload
  next();
}

/**
 * Middleware de rate limiting simples (em memória).
 * Bloqueia após N tentativas por IP em um intervalo de tempo.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(windowMs: number = 60000, maxAttempts: number = 5) {
  return function (req: TenantRequest, res: Response, next: NextFunction): void {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const record = attempts.get(ip);

    if (!record || now > record.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > maxAttempts) {
      res.set('Retry-After', Math.ceil((record.resetAt - now) / 1000).toString());
      throw new AppError('Muitas tentativas. Tente novamente mais tarde.', 429);
    }

    next();
  };
}
