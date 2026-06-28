import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../services/supabaseClient';
import { TenantRequest, Professor } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateProfessorId } from '../utils/idGenerator';
import { validateProfessorNome } from '../utils/validators';
import { processCSVUpload } from '../services/csvParser';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN: number = 86400; // 24h em segundos

/**
 * Gera hash SHA256 do formato: SHA256(professor + unidade + timestamp + salt)
 */
function generateHash(professor: string, tenantId: string, salt: string): string {
  const timestamp = Date.now().toString();
  const data = `${professor}${tenantId}${timestamp}${salt}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class AuthController {
  /**
   * POST /auth/login
   * Autentica um professor existente via hash.
   */
  static async login(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome } = req.body;
      const tenantId = req.tenantId!;

      if (!nome) {
        throw new AppError('Preencha o nome do professor', 400);
      }

      // Busca professor no banco
      const { data: professor, error } = await supabase
        .from('professores')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('nome', nome.trim())
        .single();

      if (error || !professor) {
        throw new AppError('Nenhum cadastro encontrado. Marque "Primeiro acesso".', 401);
      }

      // Em produção, a validação de hash deve ser implementada
      // Aqui estamos simplificando para permitir login com nome correto
      // No futuro, o frontend enviará o hash e faremos a comparação

      // Gera JWT
      const jwtPayload = {
        professorId: professor.id,
        tenantId: professor.tenant_id,
        nome: professor.nome,
      };

      const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        message: 'Login realizado com sucesso',
        professorId: professor.id,
        nome: professor.nome,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/primeiro-acesso
   * Cadastra um novo professor com upload de CSV.
   */
  static async primeiroAcesso(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome } = req.body;
      const csvFile = req.file; // Arquivo enviado via multer
      const tenantId = req.tenantId!;

      validateProfessorNome(req, res, () => {}); // Valida nome

      const professorNome = nome.trim();

      // Verifica se já existe professor com esse nome
      const { data: existingProfessor } = await supabase
        .from('professores')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('nome', professorNome)
        .single();

      if (existingProfessor) {
        throw new AppError('Professor já cadastrado. Use o login normal.', 400);
      }

      // Busca IDs existentes para gerar ID único
      const { data: existingProfessors } = await supabase
        .from('professores')
        .select('id')
        .eq('tenant_id', tenantId);

      const existingIds = ((existingProfessors || []) as { id: string }[]).map((p) => p.id);
      const professorId = generateProfessorId(professorNome, existingIds);

      // Gera hash
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = generateHash(professorNome, tenantId, salt);

      // Insere professor
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

      // Processa CSV se enviado
      if (csvFile) {
        try {
          const result = await processCSVUpload(csvFile.buffer, newProfessor.id, tenantId);
          console.log(`[primeiroAcesso] CSV processado: ${result.alunosOk} alunos, ${result.turmasOk} turmas`);
        } catch (csvError: any) {
          console.error('[primeiroAcesso] ERRO no CSV:', csvError.message);
          // Nao interrompe o cadastro do professor, mas reporta o erro
          throw new AppError(`Erro ao processar CSV: ${csvError.message}`, 400);
        }
      }

      // Gera JWT
      const jwtPayload = {
        professorId: newProfessor.id,
        tenantId: newProfessor.tenant_id,
        nome: newProfessor.nome,
      };

      const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        message: 'Primeiro acesso realizado com sucesso',
        professorId: newProfessor.id,
        nome: newProfessor.nome,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/clear-data (browser-friendly) ou DELETE /auth/clear-data
   * Remove todos os alunos e turmas do tenant.
   * GET: aceita tenantId via query string (ex: ?tenantId=bela-vista)
   * DELETE: exige X-Tenant-ID header + X-Admin-Key
   */
  static async clearData(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || req.tenantId!;
      const adminKey = req.headers['x-admin-key'] as string | undefined;

      if (req.method === 'DELETE' && (!adminKey || adminKey !== process.env.ADMIN_KEY)) {
        throw new AppError('Chave de admin inválida', 403);
      }

      if (!tenantId) {
        throw new AppError('Tenant ID obrigatório (header X-Tenant-ID ou query ?tenantId=)', 400);
      }

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

      const msg = `Dados do tenant "${tenantId}" limpos: alunos e turmas removidos.`;
      console.log(`[clearData] ${msg}`);
      res.json({ message: msg, alunos: true, turmas: true });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
