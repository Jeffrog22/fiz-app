import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import {
  listarAlunosService,
  criarAlunoService,
  atualizarAlunoService,
  removerAlunoService,
} from '../services/alunosService';
import {
  iniciarPeriodoService,
  fecharPeriodoAtivoService,
} from '../services/enrollmentService';

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
      const alunoData = req.body;
      const aluno = await criarAlunoService(alunoData, tenantId);

      if (alunoData.turma_id) {
        const motivo = alunoData.transferencia_externa ? 'transferencia_externa' : 'matricula_inicial';
        await iniciarPeriodoService(
          aluno.id,
          alunoData.turma_id,
          alunoData.nivel || null,
          motivo,
          tenantId,
        );
      }

      res.status(201).json(aluno);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { acao, ...updateData } = req.body;

      if (acao && acao !== 'correcao') {
        switch (acao) {
          case 'transferencia':
          case 'matricula_inicial':
            await iniciarPeriodoService(id, updateData.turma_id || null, updateData.nivel || null, acao, tenantId);
            break;
          case 'reativacao':
            await iniciarPeriodoService(id, updateData.turma_id || null, updateData.nivel || null, 'reativacao', tenantId);
            break;
          case 'desalocacao':
            await fecharPeriodoAtivoService(id, tenantId, 'desalocacao');
            break;
        }
      }

      const alunoAtualizado = await atualizarAlunoService(id, updateData, tenantId);
      res.json(alunoAtualizado);
    } catch (error) {
      next(error);
    }
  }

  static async desalocar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      await fecharPeriodoAtivoService(id, tenantId, 'desalocacao');
      const alunoAtualizado = await atualizarAlunoService(id, { turma_id: null, nivel: null }, tenantId);

      res.json(alunoAtualizado);
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
      await fecharPeriodoAtivoService(id, tenantId, 'exclusao');

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default AlunosController;
