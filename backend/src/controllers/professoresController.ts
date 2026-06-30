import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import { AppError } from '../middleware/errorHandler';

export class ProfessoresController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const { data, error } = await supabase
        .from('professores')
        .select('id, nome')
        .eq('tenant_id', tenantId)
        .order('nome', { ascending: true });

      if (error) throw new AppError('Erro ao buscar professores', 500);
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }
}

export default ProfessoresController;
