import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import {
  listarTurmasService,
  criarTurmaService,
  atualizarTurmaService,
  excluirTurmaService,
} from '../services/turmasService';

export class TurmasController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { nivel, professor_id, horario } = req.query;
      const data = await listarTurmasService(tenantId, {
        nivel: nivel as string,
        professor_id: professor_id as string,
        horario: horario as string,
      });
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const data = await criarTurmaService(req.body, tenantId);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const data = await atualizarTurmaService(id, req.body, tenantId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      await excluirTurmaService(id, tenantId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default TurmasController;
