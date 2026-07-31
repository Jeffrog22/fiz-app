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
export const JWT_EXPIRES_IN: number = 604800;

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

function validarPin(tenantId: string, pin: string): void {
  const envPinKey = `PIN_${tenantId.toUpperCase().replace(/-/g, '_')}`;
  const expectedPin = process.env[envPinKey];
  if (expectedPin) {
    if (!pin || pin.trim() !== expectedPin) {
      throw new AppError('PIN da unidade inválido. Verifique com o administrador.', 401);
    }
  } else {
    console.warn(`[auth] PIN não configurado para ${tenantId} — acesso liberado sem PIN`);
  }
}

export async function loginService(
  nome: string,
  hash: string | undefined,
  tenantId: string,
  ip: string,
  pin?: string,
): Promise<{ professor: Professor; token: string; hash?: string }> {
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

  const hashValido = hash && hash === professor.hash;

  if (!hashValido) {
    if (pin) {
      validarPin(tenantId, pin);
      const salt = crypto.randomBytes(16).toString('hex');
      const novoHash = generateHash(nome.trim(), tenantId, salt);
      const { error: updateError } = await supabase
        .from('professores')
        .update({ hash: novoHash })
        .eq('id', professor.id)
        .eq('tenant_id', tenantId);
      if (updateError) {
        throw new AppError('Erro ao reautenticar. Tente novamente.', 500);
      }
      professor.hash = novoHash;
      await registrarLogAcesso({
        tenantId,
        professor: professor.nome,
        status: 'sucesso',
        ip,
      });
      const token = generateToken(professor);
      return { professor, token, hash: novoHash };
    }
    if (hash) {
      await registrarLogAcesso({
        tenantId,
        professor: nome.trim(),
        status: 'falha',
        ip,
      });
      throw new AppError('Hash inválido. Use o PIN da unidade para reautenticar neste dispositivo.', 401);
    }
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Hash não encontrado. Use o PIN da unidade para reautenticar neste dispositivo.', 401);
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
  pin: string,
  tenantId: string,
  csvBuffer?: Buffer,
): Promise<{ professor: Professor; hash: string; token: string }> {
  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    throw new AppError('Preencha o nome do professor', 400);
  }

  const envPinKey = `PIN_${tenantId.toUpperCase().replace(/-/g, '_')}`;
  const expectedPin = process.env[envPinKey];
  if (expectedPin) {
    if (!pin || pin.trim() !== expectedPin) {
      throw new AppError('PIN da unidade inválido. Verifique com o administrador.', 401);
    }
  } else {
    console.warn(`[auth] PIN não configurado para ${tenantId} — acesso liberado sem PIN`);
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
      await supabase.from('professores').delete().eq('id', newProfessor.id);
      throw new AppError(`Erro ao processar CSV: ${csvError.message}`, 400);
    }
  }

  const token = generateToken(newProfessor);
  return { professor: newProfessor, hash, token };
}

export async function adminLoginService(
  adminKey: string,
  tenantId: string,
): Promise<{ professor: Professor; token: string }> {
  if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
    throw new AppError('Chave de admin inválida', 403);
  }
  const professor: Professor = {
    id: 'admin',
    tenant_id: tenantId,
    nome: 'Administrador',
    hash: 'admin',
    criado_em: new Date().toISOString(),
  };
  const token = generateToken(professor);
  return { professor, token };
}

export async function clearDataService(tenantId: string): Promise<{ ok: boolean }> {
  const tabelasSimples = [
    { table: 'planejamento_arquivos', filter: { tenant_id: tenantId } },
    { table: 'chamadas_log', filter: { tenant_id: tenantId } },
    { table: 'anotacoes_alunos', filter: { tenant_id: tenantId } },
    { table: 'card_aula', filter: { tenant_id: tenantId } },
    { table: 'logs_operacoes', filter: { tenant_id: tenantId } },
    { table: 'logs_acesso', filter: { unidade: tenantId } },
    { table: 'calendario', filter: { tenant_id: tenantId } },
    { table: 'periodos_letivos', filter: { tenant_id: tenantId } },
  ];

  for (const { table, filter } of tabelasSimples) {
    const { error } = await supabase.from(table).delete().match(filter);
    if (error) console.warn(`[clearData] erro ao limpar ${table}: ${error.message}`);
  }

  const { error: errPlanejamentos } = await supabase.from('planejamentos').delete().eq('tenant_id', tenantId);
  if (errPlanejamentos) console.warn('[clearData] erro ao limpar planejamentos:', errPlanejamentos.message);

  const { error: errAlunos } = await supabase.from('alunos').delete().eq('tenant_id', tenantId);
  if (errAlunos) throw new AppError(`Erro ao limpar alunos: ${errAlunos.message}`, 500);

  const { error: errTurmas } = await supabase.from('turmas').delete().eq('tenant_id', tenantId);
  if (errTurmas) throw new AppError(`Erro ao limpar turmas: ${errTurmas.message}`, 500);

  const { error: errProfessores } = await supabase.from('professores').delete().eq('tenant_id', tenantId);
  if (errProfessores) throw new AppError(`Erro ao limpar professores: ${errProfessores.message}`, 500);

  console.info(`[clearData] Tenant "${tenantId}" completamente resetado.`);
  return { ok: true };
}
