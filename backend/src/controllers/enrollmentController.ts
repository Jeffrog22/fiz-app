import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import {
  listarPeriodosService,
  iniciarPeriodoService,
} from '../services/enrollmentService';

export class EnrollmentController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { alunoId } = req.params;
      const data = await listarPeriodosService(alunoId, tenantId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { alunoId } = req.params;
      const { turma_id, nivel, motivo } = req.body;

      if (!motivo) throw new Error('Motivo é obrigatório');

      const data = await iniciarPeriodoService(alunoId, turma_id || null, nivel || null, motivo, tenantId);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
}
