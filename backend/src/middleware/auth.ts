import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantRequest, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Middleware de autenticação JWT.
 * 
 * Verifica se o token JWT está presente no cookie httpOnly
 * e se é válido. Injeta os dados do payload em `req.professorId`.
 * 
 * Também valida se o tenant_id do token corresponde ao tenant_id
 * da requisição (proteção multi-tenant).
 */
export function authMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  // Tenta extrair o token do cookie
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Valida se o tenant do token corresponde ao tenant da requisição
    if (decoded.tenantId !== req.tenantId) {
      res.status(403).json({ error: 'Tenant do token não corresponde ao tenant da requisição' });
      return;
    }

    req.professorId = decoded.professorId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }
    res.status(401).json({ error: 'Token inválido' });
  }
}

export default authMiddleware;
