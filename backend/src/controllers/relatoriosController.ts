import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as relatoriosService from '../services/relatoriosService';

export class RelatoriosController {
  static async frequenciaAluno(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const mes = parseInt(req.query.mes as string) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano as string) || new Date().getFullYear();
      const result = await relatoriosService.frequenciaAluno(tenantId, mes, ano);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async frequenciaTurma(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const mes = parseInt(req.query.mes as string) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano as string) || new Date().getFullYear();
      const result = await relatoriosService.frequenciaTurma(tenantId, mes, ano);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async rotatividade(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const mes = parseInt(req.query.mes as string) || 0;
      const ano = parseInt(req.query.ano as string) || new Date().getFullYear();
      const result = await relatoriosService.rotatividade(tenantId, mes, ano);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async exclusoesStats(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const mes = parseInt(req.query.mes as string) || new Date().getMonth() + 1;
      const ano = parseInt(req.query.ano as string) || new Date().getFullYear();
      const result = await relatoriosService.exclusoesStats(tenantId, mes, ano);
      res.json(result);
    } catch (e) { next(e); }
  }
}
