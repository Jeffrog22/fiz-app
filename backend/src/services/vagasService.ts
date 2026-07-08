import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import type { VagasResponse } from '../types';

export async function listar(
  tenantId: string,
  filters?: { nivel?: string; periodo?: string; turma_label?: string }
): Promise<VagasResponse> {
  const { nivel, periodo, turma_label } = filters || {};

  let query = supabase
    .from('turmas')
    .select('*, professores!inner(id, nome)')
    .eq('tenant_id', tenantId);

  if (nivel) query = query.eq('nivel', nivel);
  if (turma_label) query = query.eq('label', turma_label);
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

  const gruposMap: Record<string, { horario: string; label: string; grupos: any[] }> = {};

  for (const t of turmas || []) {
    const key = `${t.horario}|${t.label}`;
    if (!gruposMap[key]) {
      gruposMap[key] = { horario: t.horario, label: t.label, grupos: [] };
    }
    const ocup = ocupacao[t.grupo_id || t.id] || 0;
    const cap = t.capacidade || 0;
    gruposMap[key].grupos.push({
      grupo_id: t.grupo_id || t.id,
      nivel: t.nivel,
      professor: t.professores?.nome || '---',
      capacidade: cap,
      alunos_ativos: ocup,
      vagas: Math.max(0, cap - ocup),
      excedente: Math.max(0, ocup - cap),
    });
  }

  const horarios = Object.values(gruposMap)
    .map((h) => {
      const total_capacidade = h.grupos.reduce((s: number, g: any) => s + g.capacidade, 0);
      const total_ativos = h.grupos.reduce((s: number, g: any) => s + g.alunos_ativos, 0);
      return {
        horario: h.horario,
        label: h.label,
        total_capacidade,
        total_ativos,
        total_vagas: Math.max(0, total_capacidade - total_ativos),
        total_excedente: Math.max(0, total_ativos - total_capacidade),
        grupos: h.grupos,
      };
    })
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const totais = horarios.reduce(
    (acc, h) => ({
      capacidade: acc.capacidade + h.total_capacidade,
      ativos: acc.ativos + h.total_ativos,
      vagas: acc.vagas + h.total_vagas,
      excedente: acc.excedente + h.total_excedente,
    }),
    { capacidade: 0, ativos: 0, vagas: 0, excedente: 0 }
  );

  return { totais, horarios };
}
