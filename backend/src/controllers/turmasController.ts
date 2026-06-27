import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest, Turma } from '../types';
import { AppError } from '../middleware/errorHandler';

export class TurmasController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { nivel, professor_id, horario } = req.query;

      let query = supabase
        .from('turmas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('horario', { ascending: true });

      if (nivel) query = query.eq('nivel', nivel as string);
      if (professor_id) query = query.eq('professor_id', professor_id as string);
      if (horario) query = query.eq('horario', horario as string);

      const { data, error } = await query;

      if (error) throw new AppError('Erro ao buscar turmas', 500);
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { label, horario, professor_id, nivel, capacidade, faixa_etaria } = req.body;

      if (!label || !horario) {
        throw new AppError('Label e horário são obrigatórios', 400);
      }

      const { data, error } = await supabase
        .from('turmas')
        .insert({
          tenant_id: tenantId,
          label,
          horario,
          professor_id: professor_id || null,
          nivel,
          capacidade,
          faixa_etaria,
        })
        .select()
        .single();

      if (error || !data) throw new AppError('Erro ao criar turma', 500);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { label, horario, professor_id, nivel, capacidade, faixa_etaria } = req.body;

      const { data, error } = await supabase
        .from('turmas')
        .update({
          label,
          horario,
          professor_id,
          nivel,
          capacidade,
          faixa_etaria,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error || !data) throw new AppError('Erro ao atualizar turma', 500);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      // Verifica se existem alunos na turma
      const { count, error: countError } = await supabase
        .from('alunos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('turma_id', id);

      if (countError) throw new AppError('Erro ao verificar alunos', 500);

      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw new AppError('Erro ao remover turma', 500);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default TurmasController;