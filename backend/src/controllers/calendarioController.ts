import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class CalendarioController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { mes, ano } = req.query;
      let query = supabase.from('calendario').select('*').eq('tenant_id', tenantId);
      if (mes && ano) {
        const mesStr = String(mes).padStart(2, '0');
        const inicio = `${ano}-${mesStr}-01`;
        const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
        const fim = `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;
        query = query.gte('data', inicio).lte('data', fim);
      }
      const { data, error } = await query.order('data', { ascending: true });
      if (error) throw new AppError('Erro ao buscar calendario', 500);
      res.json(data || []);
    } catch (e) { next(e); }
  }

  static async salvarPeriodo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { inicio_aulas, ferias_inicio, ferias_fim, termino_aulas } = req.body;

      const { data: existing, error: queryError } = await supabase
        .from('periodos_letivos')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);

      if (queryError) throw new AppError('Erro ao verificar periodo', 500);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('periodos_letivos')
          .update({ inicio_aulas, ferias_inicio, ferias_fim, termino_aulas })
          .eq('tenant_id', tenantId);
        if (error) throw new AppError('Erro ao atualizar periodo', 500);
      } else {
        const { error } = await supabase
          .from('periodos_letivos')
          .insert({ tenant_id: tenantId, inicio_aulas, ferias_inicio, ferias_fim, termino_aulas });
        if (error) throw new AppError('Erro ao criar periodo', 500);
      }

      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async obterPeriodo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { data, error } = await supabase
        .from('periodos_letivos')
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw new AppError('Erro ao buscar periodo', 500);
      res.json(data || null);
    } catch (e) { next(e); }
  }

  static async salvarEvento(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { data, tipo, descricao } = req.body;
      if (!data || !tipo) throw new AppError('Campos data e tipo sao obrigatorios', 400);

      const { data: existing, error: queryError } = await supabase
        .from('calendario')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('data', data)
        .eq('tipo', tipo)
        .limit(1);

      if (queryError) throw new AppError('Erro ao verificar evento', 500);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('calendario')
          .update({ descricao })
          .eq('id', existing[0].id);
        if (error) throw new AppError('Erro ao atualizar evento', 500);
      } else {
        const { error } = await supabase
          .from('calendario')
          .insert({ tenant_id: tenantId, data, tipo, descricao });
        if (error) throw new AppError('Erro ao criar evento', 500);
      }

      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async removerEvento(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { error } = await supabase
        .from('calendario')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw new AppError('Erro ao remover evento', 500);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
}
