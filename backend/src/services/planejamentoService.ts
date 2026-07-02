import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/planejamento');

function garantirPasta() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

interface ArquivoInfo {
  id: string;
  nome_original: string;
  nome_arquivo: string;
  tamanho: number;
  tipo: string;
  criado_em: string;
}

export async function listar(tenantId: string): Promise<ArquivoInfo[]> {
  const { data, error } = await supabase
    .from('planejamento_arquivos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[planejamentoService.listar]', error);
    throw new AppError('Erro ao listar arquivos', 500);
  }
  return data || [];
}

export async function salvar(
  tenantId: string,
  arquivo: Express.Multer.File,
): Promise<ArquivoInfo> {
  garantirPasta();
  const nomeArquivo = `${Date.now()}-${arquivo.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const caminho = path.join(UPLOADS_DIR, nomeArquivo);
  fs.writeFileSync(caminho, arquivo.buffer);
  const { data, error } = await supabase
    .from('planejamento_arquivos')
    .insert({
      tenant_id: tenantId,
      nome_original: arquivo.originalname,
      nome_arquivo: nomeArquivo,
      tamanho: arquivo.size,
      tipo: arquivo.mimetype,
    })
    .select()
    .single();

  if (error) {
    console.error('[planejamentoService.salvar]', error);
    fs.unlinkSync(caminho);
    throw new AppError('Erro ao salvar arquivo', 500);
  }
  return data;
}

export async function remover(tenantId: string, id: string): Promise<void> {
  const { data: arquivo, error: buscaError } = await supabase
    .from('planejamento_arquivos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (buscaError || !arquivo) {
    throw new AppError('Arquivo nao encontrado', 404);
  }

  const caminho = path.join(UPLOADS_DIR, arquivo.nome_arquivo);
  if (fs.existsSync(caminho)) {
    fs.unlinkSync(caminho);
  }

  const { error } = await supabase
    .from('planejamento_arquivos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[planejamentoService.remover]', error);
    throw new AppError('Erro ao remover arquivo', 500);
  }
}

export async function obterCaminho(tenantId: string, id: string): Promise<string> {
  const { data: arquivo, error } = await supabase
    .from('planejamento_arquivos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !arquivo) {
    throw new AppError('Arquivo nao encontrado', 404);
  }

  const caminho = path.join(UPLOADS_DIR, arquivo.nome_arquivo);
  if (!fs.existsSync(caminho)) {
    throw new AppError('Arquivo fisico nao encontrado', 404);
  }
  return caminho;
}
