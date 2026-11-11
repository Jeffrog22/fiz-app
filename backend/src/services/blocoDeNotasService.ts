import { supabase } from './supabaseClient';
import { BlocoDeNotas, ItemNota, TipoNota, CorNota } from '../types';
import { AppError } from '../middleware/errorHandler';

type CriarNotaInput = {
  titulo: string;
  conteudo?: string;
  tipo?: TipoNota;
  itens?: ItemNota[];
  cor?: CorNota;
};

type AtualizarNotaInput = {
  titulo?: string;
  conteudo?: string;
  tipo?: TipoNota;
  itens?: ItemNota[];
  cor?: CorNota;
  fixada?: boolean;
};

export async function listarNotas(tenantId: string, professorId: string): Promise<BlocoDeNotas[]> {
  const { data, error } = await supabase
    .from('bloco_de_notas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('professor_id', professorId)
    .order('fixada', { ascending: false })
    .order('atualizado_em', { ascending: false });

  if (error) throw new AppError('Erro ao buscar notas', 500);
  return (data || []) as BlocoDeNotas[];
}

export async function criarNota(tenantId: string, professorId: string, input: CriarNotaInput): Promise<BlocoDeNotas> {
  if (!input.titulo || !input.titulo.trim()) throw new AppError('Titulo e obrigatorio', 400);

  const { data, error } = await supabase
    .from('bloco_de_notas')
    .insert({
      tenant_id: tenantId,
      professor_id: professorId,
      titulo: input.titulo.trim(),
      conteudo: input.conteudo ?? '',
      tipo: input.tipo ?? 'texto',
      itens: input.itens ?? [],
      cor: input.cor ?? 'amarelo',
      fixada: false,
    })
    .select()
    .single();

  if (error) throw new AppError('Erro ao criar nota', 500);
  return data as BlocoDeNotas;
}

export async function atualizarNota(
  id: string,
  tenantId: string,
  professorId: string,
  input: AtualizarNotaInput,
): Promise<BlocoDeNotas> {
  const update: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (input.titulo !== undefined) {
    if (!input.titulo.trim()) throw new AppError('Titulo nao pode ser vazio', 400);
    update.titulo = input.titulo.trim();
  }
  if (input.conteudo !== undefined) update.conteudo = input.conteudo;
  if (input.tipo !== undefined) update.tipo = input.tipo;
  if (input.itens !== undefined) update.itens = input.itens;
  if (input.cor !== undefined) update.cor = input.cor;
  if (input.fixada !== undefined) update.fixada = input.fixada;

  const { data, error } = await supabase
    .from('bloco_de_notas')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('professor_id', professorId)
    .select()
    .single();

  if (error) throw new AppError('Erro ao atualizar nota', 500);
  if (!data) throw new AppError('Nota nao encontrada', 404);
  return data as BlocoDeNotas;
}

export async function fixarNota(
  id: string,
  tenantId: string,
  professorId: string,
  fixada: boolean,
): Promise<BlocoDeNotas> {
  return atualizarNota(id, tenantId, professorId, { fixada });
}

export async function removerNota(id: string, tenantId: string, professorId: string): Promise<void> {
  const { error } = await supabase
    .from('bloco_de_notas')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('professor_id', professorId);

  if (error) throw new AppError('Erro ao remover nota', 500);
}
