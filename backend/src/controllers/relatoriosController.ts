import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as relatoriosService from '../services/relatoriosService';

export class RelatoriosController {
  static async frequencia(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano } = req.query;
      const result = await relatoriosService.frequencia(tenantId, {
        mes: mes ? Number(mes) : undefined,
        ano: ano ? Number(ano) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  }

  static async vagas(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const result = await relatoriosService.vagas(tenantId);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async cancelamentos(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano } = req.query;
      const result = await relatoriosService.cancelamentos(tenantId, {
        mes: mes ? Number(mes) : undefined,
        ano: ano ? Number(ano) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  }
}
