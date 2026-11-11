import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as blocoDeNotasService from '../services/blocoDeNotasService';

export class BlocoDeNotasController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const result = await blocoDeNotasService.listarNotas(tenantId, professorId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const result = await blocoDeNotasService.criarNota(tenantId, professorId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const { id } = req.params;
      const result = await blocoDeNotasService.atualizarNota(id, tenantId, professorId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async fixar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const { id } = req.params;
      const { fixada } = req.body;
      const result = await blocoDeNotasService.fixarNota(id, tenantId, professorId, fixada);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const { id } = req.params;
      await blocoDeNotasService.removerNota(id, tenantId, professorId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
}

export default BlocoDeNotasController;
