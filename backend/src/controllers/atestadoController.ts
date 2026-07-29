import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as atestadoService from '../services/atestadoService';

export class AtestadoController {
  static async verificarAtestados(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const result = await atestadoService.verificarAtestados(tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default AtestadoController;
