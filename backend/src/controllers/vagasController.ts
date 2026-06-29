import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as vagasService from '../services/vagasService';

export class VagasController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { nivel, periodo } = req.query;
      const result = await vagasService.listar(tenantId, {
        nivel: nivel as string | undefined,
        periodo: periodo as string | undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  }
}
