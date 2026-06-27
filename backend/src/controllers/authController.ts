import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';

export class AuthController {
  /**
   * POST /auth/login
   * Autentica um professor existente via hash.
   */
  static async login(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Implementar na Fase 2
      res.status(501).json({ message: 'Login - A ser implementado na Fase 2' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/primeiro-acesso
   * Cadastra um novo professor com upload de CSV.
   */
  static async primeiroAcesso(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Implementar na Fase 2
      res.status(501).json({ message: 'Primeiro acesso - A ser implementado na Fase 2' });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
