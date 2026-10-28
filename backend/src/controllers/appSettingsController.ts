import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import * as appSettingsService from '../services/appSettingsService';

const ALLOWED_KEYS = new Set(['alunos_colunas_mobile', 'extrapolacao_restrita']);

// Chaves cujo PUT exige admin (professorId === 'admin' no JWT)
const ADMIN_ONLY_WRITE_KEYS = new Set(['extrapolacao_restrita']);

function validarKey(key: string): void {
  if (!ALLOWED_KEYS.has(key)) throw new AppError('Chave de configuração não permitida', 404);
}

export class AppSettingsController {
  static async get(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      validarKey(key);
      const value = await appSettingsService.getAppSetting(key);
      res.json({ key, value });
    } catch (e) { next(e); }
  }

  static async save(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      validarKey(key);
      if (ADMIN_ONLY_WRITE_KEYS.has(key) && req.professorId !== 'admin') {
        throw new AppError('Acesso negado: requer admin', 403);
      }
      const { value } = req.body;
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new AppError('value deve ser um objeto', 400);
      }
      const saved = await appSettingsService.saveAppSetting(key, value);
      res.json({ key, value: saved });
    } catch (e) { next(e); }
  }
}
