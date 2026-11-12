import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { generateGrupoId, gerarLabelFromDias } from '../utils/idGenerator';
import {
  nivelVigenteService,
  registrarVigenciaNivelService,
} from './turmaNivelService';

/** Data de hoje no horario local do servidor (YYYY-MM-DD) */
function hojeLocalISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export async function listarTurmasService(
  tenantId: string,
  filters: { nivel?: string; professor_id?: string; horario?: string; nivel_data?: string },
): Promise<any[]> {
  let query = supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('horario', { ascending: true });

  if (filters.nivel) query = query.eq('nivel', filters.nivel);
  if (filters.professor_id) query = query.eq('professor_id', filters.professor_id);
  if (filters.horario) query = query.eq('horario', filters.horario);

  const { data, error } = await query;

  if (error) throw new AppError('Erro ao buscar turmas', 500);
  const turmas = data || [];

  // Nivel vigente na data de referencia (historico por competencia)
  if (filters.nivel_data) {
    const mapa = await nivelVigenteService(tenantId, turmas, filters.nivel_data);
    return turmas.map((t: any) => ({
      ...t,
      nivel_atual: t.nivel ?? null,
      nivel: mapa.get(t.grupo_id) ?? t.nivel ?? null,
    }));
  }

  return turmas;
}

export async function criarTurmaService(data: any, tenantId: string): Promise<any> {
  const { dias, horario, professor_id, nivel, capacidade, faixa_etaria, duracao_minutos } = data;

  if (!dias || dias.length === 0 || !horario) {
    throw new AppError('Dias e horário são obrigatórios', 400);
  }

  const label = gerarLabelFromDias(dias);

  // Valida chave tríplice
  const { data: existing } = await supabase
    .from('turmas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('label', label)
    .eq('horario', horario)
    .eq('professor_id', professor_id || null)
    .maybeSingle();

  if (existing) {
    throw new AppError('Já existe turma com esse label, horário e professor', 409);
  }

  // Gera grupo_id
  const { data: allGrupos } = await supabase
    .from('turmas')
    .select('grupo_id')
    .eq('tenant_id', tenantId)
    .not('grupo_id', 'is', null);

  const existingIds = (allGrupos || []).map((g: any) => g.grupo_id);
  const grupoId = generateGrupoId(professor_id || '', dias, existingIds);

  const payload: Record<string, any> = {
    tenant_id: tenantId,
    label,
    grupo_id: grupoId,
    horario,
    professor_id: professor_id || null,
    nivel: nivel || null,
    capacidade: capacidade ?? null,
    faixa_etaria: faixa_etaria || null,
  };

  if (duracao_minutos !== undefined) payload.duracao_minutos = duracao_minutos ?? null;

  const { data: result, error } = await supabase
    .from('turmas')
    .insert(payload)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao criar turma: ${error.message}`, 500);
  if (!result) throw new AppError('Erro ao criar turma: nenhum retorno do banco', 500);

  // Registra a vigencia inicial do nivel da turma
  if (result.grupo_id && result.nivel) {
    await registrarVigenciaNivelService(
      tenantId,
      result.grupo_id,
      result.nivel,
      hojeLocalISO(),
      null,
    );
  }

  return result;
}

export async function atualizarTurmaService(id: string, data: any, tenantId: string): Promise<any> {
  const { label, horario, professor_id, nivel, capacidade, faixa_etaria, duracao_minutos } = data;

  // Nivel vigente antes da edicao (para encerrar a vigencia quando ele muda)
  const { data: anterior } = await supabase
    .from('turmas')
    .select('grupo_id, nivel')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  // Valida chave tríplice (excluindo a si mesmo)
  const { data: existing } = await supabase
    .from('turmas')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('label', label)
    .eq('horario', horario)
    .eq('professor_id', professor_id || null)
    .neq('id', id)
    .maybeSingle();

  if (existing) {
    throw new AppError('Já existe outra turma com esse label, horário e professor', 409);
  }

  const payload: Record<string, any> = {
    label,
    horario,
  };

  if (professor_id !== undefined) payload.professor_id = professor_id || null;
  if (nivel !== undefined) payload.nivel = nivel || null;
  if (capacidade !== undefined) payload.capacidade = capacidade ?? null;
  if (faixa_etaria !== undefined) payload.faixa_etaria = faixa_etaria || null;
  if (duracao_minutos !== undefined) payload.duracao_minutos = duracao_minutos ?? null;

  const { data: result, error } = await supabase
    .from('turmas')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw new AppError(`Erro ao atualizar turma: ${error.message}`, 500);
  if (!result) throw new AppError('Erro ao atualizar turma: nenhum retorno do banco', 500);

  // Mudanca manual de nivel: encerra a vigencia anterior e abre a nova
  if (
    nivel !== undefined &&
    anterior?.grupo_id &&
    result.nivel &&
    result.nivel !== anterior.nivel
  ) {
    await registrarVigenciaNivelService(
      tenantId,
      anterior.grupo_id,
      result.nivel,
      hojeLocalISO(),
      null,
    );
  }

  return result;
}

export async function excluirTurmaService(id: string, tenantId: string): Promise<void> {
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
}
