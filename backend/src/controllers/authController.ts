import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { loginService, primeiroAcessoService, clearDataService } from '../services/authService';

export class AuthController {
  static async login(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome, hash } = req.body;
      const tenantId = req.tenantId!;
      const ip = req.ip || req.socket.remoteAddress || 'desconhecido';

      const { professor, token } = await loginService(nome, hash, tenantId, ip);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        message: 'Login realizado com sucesso',
        professorId: professor.id,
        nome: professor.nome,
        hash: professor.hash,
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  static async primeiroAcesso(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome } = req.body;
      const csvFile = req.file;
      const tenantId = req.tenantId!;

      const { professor, hash, token } = await primeiroAcessoService(nome, tenantId, csvFile?.buffer);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        message: 'Primeiro acesso realizado com sucesso',
        professorId: professor.id,
        nome: professor.nome,
        hash: professor.hash,
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearData(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || req.tenantId!;
      const adminKey = req.headers['x-admin-key'] as string | undefined;

      if (req.method === 'DELETE' && (!adminKey || adminKey !== process.env.ADMIN_KEY)) {
        throw new AppError('Chave de admin inválida', 403);
      }

      if (!tenantId) {
        throw new AppError('Tenant ID obrigatório (header X-Tenant-ID ou query ?tenantId=)', 400);
      }

      const result = await clearDataService(tenantId);

      res.json({
        message: `Dados do tenant "${tenantId}" limpos: alunos e turmas removidos.`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
