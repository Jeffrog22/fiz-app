import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../services/supabaseClient';
import { TenantRequest, Professor } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateProfessorId } from '../utils/idGenerator';
import { validateProfessorNome } from '../utils/validators';

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
      console.log(`[DEBUG LOGIN] body=${JSON.stringify(req.body)} tenantId=${req.tenantId} headers=${JSON.stringify(req.headers)}`);
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
        sameSite: 'strict',
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
        throw new AppError('Erro ao cadastrar professor', 500);
      }

      // Se houver CSV, processa (placeholder)
      // TODO: Implementar parse completo do CSV na Fase 2/3
      if (csvFile) {
        console.log('📄 CSV recebido:', csvFile.originalname);
        // Aqui entra a lógica de parse e insert de alunos/turmas
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
        sameSite: 'strict',
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
}

export default AuthController;
