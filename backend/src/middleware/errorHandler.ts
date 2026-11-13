import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';

/**
 * Interface para erros operacionais customizados.
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public detalhes?: Record<string, unknown>;

  constructor(message: string, statusCode: number = 500, detalhes?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.detalhes = detalhes;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de tratamento global de erros.
 * 
 * Captura erros lançados em toda a aplicação e retorna
 * respostas padronizadas para o cliente.
 * Em ambiente de desenvolvimento, inclui o stack trace.
 */
export function errorHandler(
  err: Error | AppError,
  _req: TenantRequest,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Erro interno do servidor';

  console.error(`[ERROR] ${statusCode} - ${message}`, err.stack);

  res.status(statusCode).json({
    error: message,
    ...(err instanceof AppError && err.detalhes ? { detalhes: err.detalhes } : {}),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export default errorHandler;
