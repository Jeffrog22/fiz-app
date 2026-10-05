import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import { AppError } from '../middleware/errorHandler';

const MAX_NOME_DOCUMENTO = 80;

export class ProfessoresController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const { data, error } = await supabase
        .from('professores')
        .select('id, nome, nome_documento, hash')
        .eq('tenant_id', tenantId)
        .order('nome', { ascending: true });

      if (error) throw new AppError('Erro ao buscar professores', 500);
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }

  // Atualiza apenas nome_documento (nome formal usado nos documentos/XLSX).
  // O nome de login (professores.nome) é imutável por aqui.
  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const professorId = req.professorId!;
      const { id } = req.params;

      if (professorId !== id && professorId !== 'admin') {
        throw new AppError('Sem permissão para editar este professor', 403);
      }

      const raw = req.body?.nome_documento;
      if (raw !== null && typeof raw !== 'string') {
        throw new AppError('nome_documento deve ser string ou null', 400);
      }
      const nomeDocumento = typeof raw === 'string' ? raw.trim() : null;
      if (nomeDocumento && nomeDocumento.length > MAX_NOME_DOCUMENTO) {
        throw new AppError(`nome_documento deve ter no máximo ${MAX_NOME_DOCUMENTO} caracteres`, 400);
      }

      const { error } = await supabase
        .from('professores')
        .update({ nome_documento: nomeDocumento || null })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw new AppError('Erro ao atualizar professor', 500);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}

export default ProfessoresController;
