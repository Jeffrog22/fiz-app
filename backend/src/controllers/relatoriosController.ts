import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as relatoriosService from '../services/relatoriosService';

export class RelatoriosController {
  static async metricas(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { periodo } = req.query;
      const validPeriodo = periodo === 'semana' || periodo === 'ano' ? periodo : 'mes';
      const result = await relatoriosService.metricas(tenantId, { periodo: validPeriodo });
      res.json(result);
    } catch (e) { next(e); }
  }

  static async timeline(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { label, professor_id } = req.query;
      const result = await relatoriosService.timeline(tenantId, {
        label: label ? String(label) : undefined,
        professor_id: professor_id ? String(professor_id) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  }

  static async frequencia(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano, aluno_id, periodo } = req.query;
      const result = await relatoriosService.frequencia(tenantId, {
        mes: mes ? Number(mes) : undefined,
        ano: ano ? Number(ano) : undefined,
        aluno_id: aluno_id ? String(aluno_id) : undefined,
        periodo: periodo === 'semana' || periodo === 'ano' ? String(periodo) : undefined,
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

  static async controleMensal(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano, label, professor_id } = req.query;
      const result = await relatoriosService.controleMensal(tenantId, {
        mes: mes ? Number(mes) : undefined,
        ano: ano ? Number(ano) : undefined,
        label: label ? String(label) : undefined,
        professor_id: professor_id ? String(professor_id) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  }

  static async exportarCancelamentos(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano } = req.query;
      const buffer = await relatoriosService.exportarCancelamentosXLSX(tenantId, {
        mes: mes ? Number(mes) : undefined,
        ano: ano ? Number(ano) : undefined,
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="cancelamentos-${mes || 'todos'}-${ano || 'todos'}.xlsx"`);
      res.send(buffer);
    } catch (e) { next(e); }
  }
}
