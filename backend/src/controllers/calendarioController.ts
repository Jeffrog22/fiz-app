import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as calendarioService from '../services/calendarioService';

export class CalendarioController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano } = req.query;
      const result = await calendarioService.listar(tenantId, mes ? Number(mes) : undefined, ano ? Number(ano) : undefined);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async salvarPeriodo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      await calendarioService.salvarPeriodo(tenantId, req.body);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async obterPeriodo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const result = await calendarioService.obterPeriodo(tenantId);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async salvarEvento(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { data, tipo, descricao } = req.body;
      await calendarioService.salvarEvento(tenantId, data, tipo, descricao);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async removerEvento(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      await calendarioService.removerEvento(tenantId, id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
}
