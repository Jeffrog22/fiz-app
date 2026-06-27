import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class VagasController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { data, error } = await supabase.from('turmas').select('*').eq('tenant_id', tenantId);
      if (error) throw new AppError('Erro ao buscar vagas', 500);
      res.json(data || []);
    } catch (e) { next(e); }
  }
}
