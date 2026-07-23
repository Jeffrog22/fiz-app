import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as exclusoesService from '../services/exclusoesService';

export class ExclusoesController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mostrarOcultos } = req.query;
      const result = await exclusoesService.listar(tenantId, mostrarOcultos as string | undefined);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async restaurar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id, turma_id, transferencia_externa } = req.body;
      await exclusoesService.restaurar(id, tenantId, turma_id, transferencia_externa);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { motivo, data_exclusao } = req.body;
      await exclusoesService.atualizar(id, tenantId, { motivo, data_exclusao });
      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async excluirDefinitivo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      await exclusoesService.excluirDefinitivo(id, tenantId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
}
