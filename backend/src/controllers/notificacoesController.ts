import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as notificacoesService from '../services/notificacoesService';

export class NotificacoesController {
  static async getPublicKey(_req: TenantRequest, res: Response, _next: NextFunction) {
    res.json({ publicKey: notificacoesService.getPublicKey() });
  }

  static async subscribe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      await notificacoesService.subscribe(tenantId, professorId, req.body);
      res.status(201).json({ message: 'Inscrição realizada com sucesso' });
    } catch (e) { next(e); }
  }

  static async unsubscribe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { endpoint } = req.body;
      const count = await notificacoesService.unsubscribe(endpoint);
      res.json({ message: 'Inscrição removida com sucesso', removidas: count });
    } catch (e) { next(e); }
  }

  static async getConfig(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const professorId = req.professorId!;
      const result = await notificacoesService.getConfig(professorId);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async updateConfig(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const result = await notificacoesService.updateConfig(tenantId, professorId, req.body);
      res.json(result);
    } catch (e) { next(e); }
  }
}
