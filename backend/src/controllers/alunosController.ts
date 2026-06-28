import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest, Aluno } from '../types';
import { AppError } from '../middleware/errorHandler';

function calcularCategoria(dataNascimento?: string): string | undefined {
  if (!dataNascimento) return undefined;
  const nasc = new Date(dataNascimento + 'T12:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;

  if (idade < 2) return 'Bebe';
  if (idade <= 3) return 'Infantil A';
  if (idade <= 5) return 'Infantil B';
  if (idade <= 7) return 'Infantil C';
  if (idade <= 9) return 'Infantil D';
  if (idade <= 11) return 'Juvenil A';
  if (idade <= 13) return 'Juvenil B';
  if (idade <= 15) return 'Juvenil C';
  if (idade <= 17) return 'Juvenil D';
  if (idade <= 29) return 'Adulto';
  if (idade <= 49) return 'Master';
  return 'Master+';
}

export class AlunosController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { nome, ativo } = req.query;

      let query = supabase
        .from('alunos')
        .select('*')
        .eq('tenant_id', tenantId);

      if (nome) query = query.ilike('nome', `%${nome}%`);
      if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

      const { data, error } = await query.order('nome', { ascending: true });

      if (error) {
        console.error('[alunos/listar] Supabase error:', error);
        throw new AppError(`Erro ao buscar alunos: ${error.message}`, 500);
      }
      console.log(`[alunos/listar] ${data?.length || 0} alunos retornados para tenant ${tenantId}`);
      res.json(data || []);
    } catch (error) {
      next(error);
    }
  }

  static async criar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        nome, data_nascimento, genero, contato,
        par_q, atestado_medico, data_atestado,
        nivel, turma_id
      } = req.body;

      if (!nome || nome.trim().length === 0) {
        throw new AppError('Nome do aluno e obrigatorio', 400);
      }

      const { data: existente } = await supabase
        .from('alunos')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('nome', nome.trim())
        .maybeSingle();

      if (existente) {
        throw new AppError('Aluno ja cadastrado nesta unidade', 400);
      }

      const categoria = calcularCategoria(data_nascimento);

      const { data, error } = await supabase
        .from('alunos')
        .insert({
          tenant_id: tenantId,
          nome: nome.trim(),
          data_nascimento: data_nascimento || null,
          genero: genero || null,
          contato: contato || null,
          par_q: par_q ?? null,
          atestado_medico: atestado_medico ?? null,
          data_atestado: data_atestado || null,
          nivel: nivel || null,
          turma_id: turma_id || null,
          categoria: categoria || null,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('[alunos/criar] Supabase error:', error);
        throw new AppError('Erro ao criar aluno', 500);
      }
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async atualizar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const {
        nome, data_nascimento, genero, contato, ativo,
        par_q, atestado_medico, data_atestado,
        nivel, turma_id
      } = req.body;

      const categoria = data_nascimento ? calcularCategoria(data_nascimento) : undefined;

      const { data, error } = await supabase
        .from('alunos')
        .update({
          nome: nome?.trim(),
          data_nascimento,
          genero,
          contato,
          ativo,
          par_q,
          atestado_medico,
          data_atestado,
          nivel: nivel || null,
          turma_id: turma_id || null,
          categoria: categoria || null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error || !data) {
        console.error('[alunos/atualizar] Supabase error:', error);
        throw new AppError('Erro ao atualizar aluno', 500);
      }
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