import { supabase } from './supabaseClient';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';
import { Professor } from '../types';
import { generateProfessorId } from '../utils/idGenerator';
import { processCSVUpload } from './csvParser';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET obrigatório em produção');
}
const JWT_EXPIRES_IN: number = 86400;

function generateHash(professor: string, tenantId: string, salt: string): string {
  const timestamp = Date.now().toString();
  const data = `${professor}${tenantId}${timestamp}${salt}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateToken(professor: Professor): string {
  const jwtPayload = {
    professorId: professor.id,
    tenantId: professor.tenant_id,
    nome: professor.nome,
  };
  return jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function registrarLogAcesso(params: {
  tenantId: string;
  professor: string;
  status: 'sucesso' | 'falha';
  ip: string;
}): Promise<void> {
  try {
    await supabase.from('logs_acesso').insert({
      tenant_id: params.tenantId,
      professor: params.professor,
      unidade: params.tenantId,
      status: params.status,
      ip: params.ip,
    });
  } catch {
    console.warn('[audit] falha ao registrar log de acesso');
  }
}

export async function loginService(
  nome: string,
  hash: string | undefined,
  tenantId: string,
  ip: string,
): Promise<{ professor: Professor; token: string }> {
  if (!nome) {
    throw new AppError('Preencha o nome do professor', 400);
  }

  const { data: professor, error } = await supabase
    .from('professores')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('nome', nome.trim())
    .single();

  if (error || !professor) {
    await registrarLogAcesso({
      tenantId,
      professor: nome?.trim() || 'desconhecido',
      status: 'falha',
      ip,
    });
    throw new AppError('Nenhum cadastro encontrado. Marque "Primeiro acesso".', 401);
  }

  if (hash) {
    if (hash !== professor.hash) {
      await registrarLogAcesso({
        tenantId,
        professor: nome.trim(),
        status: 'falha',
        ip,
      });
      throw new AppError('Hash inválido. Faça login novamente pelo primeiro acesso.', 401);
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Hash obrigatório para login em produção.', 401);
    }
    console.warn('[auth] Login sem hash em modo dev — NÃO USE EM PRODUÇÃO');
  }

  await registrarLogAcesso({
    tenantId,
    professor: professor.nome,
    status: 'sucesso',
    ip,
  });

  const token = generateToken(professor);
  return { professor, token };
}

export async function primeiroAcessoService(
  nome: string,
  tenantId: string,
  csvBuffer?: Buffer,
): Promise<{ professor: Professor; hash: string; token: string }> {
  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    throw new AppError('Preencha o nome do professor', 400);
  }

  const professorNome = nome.trim();

  const { data: existingProfessor } = await supabase
    .from('professores')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('nome', professorNome)
    .single();

  if (existingProfessor) {
    throw new AppError('Professor já cadastrado. Use o login normal.', 400);
  }

  const { data: existingProfessors } = await supabase
    .from('professores')
    .select('id')
    .eq('tenant_id', tenantId);

  const existingIds = ((existingProfessors || []) as { id: string }[]).map((p) => p.id);
  const professorId = generateProfessorId(professorNome, existingIds);

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = generateHash(professorNome, tenantId, salt);

  const { data: newProfessor, error: insertError } = await supabase
    .from('professores')
    .insert({
      id: professorId,
      tenant_id: tenantId,
      nome: professorNome,
      hash: hash,
    })
    .select()
    .single();

  if (insertError || !newProfessor) {
    console.error('[DEBUG PRIMEIRO ACESSO] insertError:', JSON.stringify(insertError));
    throw new AppError(`Erro ao cadastrar professor: ${insertError?.message || 'erro desconhecido'}`, 500);
  }

  if (csvBuffer) {
    try {
      const result = await processCSVUpload(csvBuffer, newProfessor.id, tenantId);
      console.info(`[primeiroAcesso] CSV processado: ${result.alunosOk} alunos, ${result.turmasOk} turmas`);
    } catch (csvError: any) {
      console.error('[primeiroAcesso] ERRO no CSV:', csvError.message);
      throw new AppError(`Erro ao processar CSV: ${csvError.message}`, 400);
    }
  }

  const token = generateToken(newProfessor);
  return { professor: newProfessor, hash, token };
}

export async function clearDataService(tenantId: string): Promise<{ alunos: boolean; turmas: boolean }> {
  const { error: errAlunos } = await supabase
    .from('alunos')
    .delete()
    .eq('tenant_id', tenantId);

  if (errAlunos) throw new AppError(`Erro ao limpar alunos: ${errAlunos.message}`, 500);

  const { error: errTurmas } = await supabase
    .from('turmas')
    .delete()
    .eq('tenant_id', tenantId);

  if (errTurmas) throw new AppError(`Erro ao limpar turmas: ${errTurmas.message}`, 500);

  console.info(`[clearData] Dados do tenant "${tenantId}" limpos: alunos e turmas removidos.`);
  return { alunos: true, turmas: true };
}
