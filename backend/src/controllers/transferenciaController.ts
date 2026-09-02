import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as transferenciaService from '../services/transferenciaService';

export class TransferenciaController {
  static async criar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const { aluno_id, tenant_destino, aluno_ids, turma_sugerida, motivo } = req.body;

      if (aluno_ids && Array.isArray(aluno_ids)) {
        const result = await transferenciaService.criarLote(
          tenantId, professorId, aluno_ids, tenant_destino, motivo,
        );
        res.json(result);
      } else if (aluno_id) {
        const result = await transferenciaService.criar(
          tenantId, professorId, aluno_id, tenant_destino,
          turma_sugerida, motivo,
        );
        res.json({ criadas: 1, erros: [], transferencia: result });
      } else {
        res.status(400).json({ error: 'Forneça aluno_id ou aluno_ids' });
      }
    } catch (e) { next(e); }
  }

  static async listarEnviadas(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await transferenciaService.listarEnviadas(req.tenantId!);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async listarRecebidas(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await transferenciaService.listarRecebidas(req.tenantId!);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async listarFila(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await transferenciaService.listarFilaGlobal();
      res.json(result);
    } catch (e) { next(e); }
  }

  static async listarHistorico(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await transferenciaService.listarHistorico(req.tenantId!);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async aceitar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { turma_id, nivel } = req.body;
      const result = await transferenciaService.aceitar(
        id, req.tenantId!, req.professorId!, turma_id, nivel,
      );
      res.json(result);
    } catch (e) { next(e); }
  }

  static async cancelar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await transferenciaService.cancelar(id, req.tenantId!, req.professorId!);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async contarPendentes(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const count = await transferenciaService.contarPendentesRecebidas(req.tenantId!);
      res.json({ count });
    } catch (e) { next(e); }
  }
}
