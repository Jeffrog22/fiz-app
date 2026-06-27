import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ChamadasController {
  static async listarPorData(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data } = req.params;

      const { data: logs, error } = await supabase
        .from('chamadas_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('data', data)
        .order('indice_aula', { ascending: true });

      if (error) throw new AppError('Erro ao buscar chamadas', 500);
      res.json(logs || []);
    } catch (error) {
      next(error);
    }
  }

  static async salvar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const logs = req.body;

      if (!Array.isArray(logs)) {
        throw new AppError('Payload inválido', 400);
      }

      const resultados = await Promise.all(
        logs.map(async (item: any) => {
          const { data, error } = await supabase
            .from('chamadas_log')
            .upsert({
              ...item,
              tenant_id: tenantId,
            })
            .select()
            .single();
          return { item, data, error };
        })
      );

      const comErro = resultados.find((r) => r.error);
      if (comErro) {
        throw new AppError('Erro ao salvar chamadas', 500);
      }

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
}

export default ChamadasController;