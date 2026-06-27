import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { AppError } from './errorHandler';

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
