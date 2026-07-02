import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as anotacoesService from '../services/anotacoesService';

export class AnotacoesController {
  static async listarPorAluno(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { alunoId } = req.params;
      const result = await anotacoesService.listarPorAluno(alunoId, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async listarPorAlunos(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { ids } = req.query;
      const alunoIds = typeof ids === 'string' ? ids.split(',') : [];
      const result = await anotacoesService.listarPorAlunos(alunoIds, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { aluno_id, anotacao } = req.body;
      const criadoPor = req.professorId;
      const result = await anotacoesService.criar(tenantId, aluno_id, anotacao, criadoPor);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { anotacao } = req.body;
      const result = await anotacoesService.atualizar(id, anotacao, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      await anotacoesService.remover(id, tenantId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
}

export default AnotacoesController;
