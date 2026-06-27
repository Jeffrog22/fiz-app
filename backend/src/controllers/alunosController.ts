import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest, Aluno } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AlunosController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { nome, turma_id, ativo } = req.query;

      let query = supabase
        .from('alunos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nome', { ascending: true });

      if (nome) query = query.ilike('nome', `%${nome}%`);
      if (turma_id) query = query.eq('turma_id', turma_id as string);
      if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

      const { data, error } = await query;

      if (error) throw new AppError('Erro ao buscar alunos', 500);
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { nome, data_nascimento, genero, contato, turma_id } = req.body;

      if (!nome || nome.trim().length === 0) {
        throw new AppError('Nome do aluno é obrigatório', 400);
      }

      // Verifica duplicidade no mesmo tenant
      const { data: existente } = await supabase
        .from('alunos')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('nome', nome.trim())
        .maybeSingle();

      if (existente) {
        throw new AppError('Aluno já cadastrado nesta unidade', 400);
      }

      const { data, error } = await supabase
        .from('alunos')
        .insert({
          tenant_id: tenantId,
          nome: nome.trim(),
          data_nascimento: data_nascimento || null,
          genero: genero || null,
          contato: contato || null,
          turma_id: turma_id || null,
        })
        .select()
        .single();

      if (error || !data) throw new AppError('Erro ao criar aluno', 500);
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const { nome, data_nascimento, genero, contato, ativo, turma_id } = req.body;

      const { data, error } = await supabase
        .from('alunos')
        .update({
          nome: nome?.trim(),
          data_nascimento,
          genero,
          contato,
          ativo,
          turma_id,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error || !data) throw new AppError('Erro ao atualizar aluno', 500);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;

      const { error } = await supabase
        .from('alunos')
        .update({ ativo: false })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw new AppError('Erro ao remover aluno', 500);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default AlunosController;