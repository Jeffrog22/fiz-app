import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import { parseFile } from '../utils/planejamentoParser';
import * as calendarioService from './calendarioService';
import type { Planejamento, PlanejamentoBloco } from '../types';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/planejamento');

function garantirPasta() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function listar(tenantId: string): Promise<Planejamento[]> {
  const { data, error } = await supabase
    .from('planejamentos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[planejamentoService.listar]', error);
    throw new AppError('Erro ao listar planejamentos', 500);
  }
  return data || [];
}

export async function uploadComParse(
  tenantId: string,
  arquivo: Express.Multer.File,
): Promise<Planejamento> {
  garantirPasta();
  const nomeArquivo = `${Date.now()}-${arquivo.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const caminho = path.join(UPLOADS_DIR, nomeArquivo);
  fs.writeFileSync(caminho, arquivo.buffer);

  let parsed;
  try {
    parsed = await parseFile(caminho, arquivo.originalname, arquivo.mimetype);
  } catch (err: any) {
    fs.unlinkSync(caminho);
    throw new AppError(err.message || 'Erro ao processar arquivo', 400);
  }

  const { data: planejamento, error: insertError } = await supabase
    .from('planejamentos')
    .insert({
      tenant_id: tenantId,
      tipo: parsed.tipo,
      ano: parsed.ano,
      total_blocos: parsed.blocos.length,
      nome_original: arquivo.originalname,
      nome_arquivo: nomeArquivo,
      tamanho: arquivo.size,
      tipo_mime: arquivo.mimetype,
    })
    .select()
    .single();

  if (insertError || !planejamento) {
    console.error('[planejamentoService.uploadComParse]', insertError);
    fs.unlinkSync(caminho);
    throw new AppError('Erro ao salvar planejamento', 500);
  }

  if (parsed.blocos.length > 0) {
    const blocosInserts = parsed.blocos.map((conteudo, i) => ({
      planejamento_id: planejamento.id,
      tenant_id: tenantId,
      indice: i + 1,
      tipo: parsed.tipo,
      ano: parsed.ano,
      conteudo,
    }));

    const { error: blocosError } = await supabase
      .from('planejamento_blocos')
      .insert(blocosInserts);

    if (blocosError) {
      console.error('[planejamentoService.uploadComParse] erro blocos', blocosError);
    }
  }

  return planejamento;
}

export async function remover(tenantId: string, id: string): Promise<void> {
  const { data: planejamento, error: buscaError } = await supabase
    .from('planejamentos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (buscaError || !planejamento) {
    throw new AppError('Planejamento nao encontrado', 404);
  }

  const caminho = path.join(UPLOADS_DIR, planejamento.nome_arquivo);
  if (fs.existsSync(caminho)) {
    fs.unlinkSync(caminho);
  }

  const { error: deleteError } = await supabase
    .from('planejamentos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (deleteError) {
    console.error('[planejamentoService.remover]', deleteError);
    throw new AppError('Erro ao remover planejamento', 500);
  }
}

export async function obterCaminho(tenantId: string, id: string): Promise<string> {
  const { data: planejamento, error } = await supabase
    .from('planejamentos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !planejamento) {
    throw new AppError('Planejamento nao encontrado', 404);
  }

  const caminho = path.join(UPLOADS_DIR, planejamento.nome_arquivo);
  if (!fs.existsSync(caminho)) {
    throw new AppError('Arquivo fisico nao encontrado', 404);
  }
  return caminho;
}

export async function listarTipos(tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('planejamentos')
    .select('tipo')
    .eq('tenant_id', tenantId)
    .order('tipo', { ascending: true });

  if (error) {
    console.error('[planejamentoService.listarTipos]', error);
    throw new AppError('Erro ao listar tipos', 500);
  }

  const tipos = [...new Set((data || []).map((r) => r.tipo))];
  return tipos;
}

function calcularSemanaRelativa(data: Date, inicio: Date, feriasInicio: Date | null, feriasFim: Date | null): number | null {
  if (data < inicio) return null;

  const diffMs = data.getTime() - inicio.getTime();
  const semanaGlobal = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;

  if (!feriasInicio || !feriasFim) return semanaGlobal;

  const semanasAntesFerias = Math.max(0, Math.floor((feriasInicio.getTime() - inicio.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  if (data >= feriasInicio && data <= feriasFim) return null;

  if (data > feriasFim) {
    const duracaoFeriasSemanas = Math.ceil((feriasFim.getTime() - feriasInicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return semanaGlobal - duracaoFeriasSemanas;
  }

  return semanaGlobal;
}

export async function buscarBloco(
  tenantId: string,
  tipo: string,
  data: string,
): Promise<{ bloco: PlanejamentoBloco | null; indice: number | null }> {
  const dataDate = new Date(data + 'T12:00:00');

  const periodo = await calendarioService.obterPeriodo(tenantId);
  if (!periodo?.inicio_aulas) {
    return { bloco: null, indice: null };
  }

  const inicio = new Date(periodo.inicio_aulas + 'T12:00:00');
  const feriasInicio = periodo.ferias_inicio ? new Date(periodo.ferias_inicio + 'T12:00:00') : null;
  const feriasFim = periodo.ferias_fim ? new Date(periodo.ferias_fim + 'T12:00:00') : null;

  const indice = calcularSemanaRelativa(dataDate, inicio, feriasInicio, feriasFim);
  if (!indice) {
    return { bloco: null, indice: null };
  }

  const { data: blocos, error } = await supabase
    .from('planejamento_blocos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tipo', tipo)
    .eq('indice', indice)
    .limit(1);

  if (error) {
    console.error('[planejamentoService.buscarBloco]', error);
    throw new AppError('Erro ao buscar bloco', 500);
  }

  const bloco = (blocos && blocos.length > 0) ? blocos[0] : null;
  return { bloco, indice };
}
