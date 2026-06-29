import { Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseClient';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

export class VagasController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { nivel, periodo } = req.query;

      let query = supabase
        .from('turmas')
        .select('*, professores!inner(id, nome)')
        .eq('tenant_id', tenantId);

      if (nivel) query = query.eq('nivel', nivel as string);
      if (periodo === 'manha') query = query.lt('horario', '12:00');
      if (periodo === 'tarde') query = query.gte('horario', '12:00');

      const { data: turmas, error: turmasError } = await query.order('horario', { ascending: true });
      if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

      const { data: alunos, error: alunosError } = await supabase
        .from('alunos')
        .select('turma_id')
        .eq('tenant_id', tenantId)
        .eq('ativo', true);

      if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

      const ocupacao: Record<string, number> = {};
      alunos?.forEach((a: any) => {
        if (a.turma_id) ocupacao[a.turma_id] = (ocupacao[a.turma_id] || 0) + 1;
      });

      const resultado = (turmas || []).map((t: any) => ({
        id: t.id,
        horario: t.horario,
        label: t.label,
        professor: t.professores?.nome || '---',
        nivel: t.nivel,
        capacidade: t.capacidade || 0,
        alunos_ativos: ocupacao[t.id] || 0,
        vagas: Math.max(0, (t.capacidade || 0) - (ocupacao[t.id] || 0)),
        excedente: Math.max(0, (ocupacao[t.id] || 0) - (t.capacidade || 0)),
      }));

      const totais = resultado.reduce(
        (acc, t) => ({
          capacidade: acc.capacidade + t.capacidade,
          ativos: acc.ativos + t.alunos_ativos,
          vagas: acc.vagas + t.vagas,
          excedente: acc.excedente + t.excedente,
        }),
        { capacidade: 0, ativos: 0, vagas: 0, excedente: 0 }
      );

      res.json({ totais, turmas: resultado });
    } catch (e) { next(e); }
  }
}