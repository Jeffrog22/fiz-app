import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import {
  listarAlunosService,
  criarAlunoService,
  atualizarAlunoService,
  removerAlunoService,
} from '../services/alunosService';

export class AlunosController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { nome, ativo } = req.query;
      const data = await listarAlunosService(tenantId, { nome: nome as string, ativo: ativo as string });
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = await criarAlunoService(req.body, tenantId);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const data = await atualizarAlunoService(id, req.body, tenantId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { motivo } = req.query;
      await removerAlunoService(id, tenantId, (motivo as string) || 'falta');
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default AlunosController;
