import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import * as planejamentoService from '../services/planejamentoService';

export class PlanejamentoController {
  static async listar(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const result = await planejamentoService.listar(tenantId);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async upload(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }
      const result = await planejamentoService.uploadComParse(tenantId, req.file);
      res.status(201).json(result);
    } catch (e) { next(e); }
  }

  static async uploadMultiplo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
      }
      const results = await Promise.all(
        (req.files as Express.Multer.File[]).map((f) => planejamentoService.uploadComParse(tenantId, f)),
      );
      res.status(201).json(results);
    } catch (e) { next(e); }
  }

  static async remover(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      await planejamentoService.remover(tenantId, id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }

  static async download(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { id } = req.params;
      const caminho = await planejamentoService.obterCaminho(tenantId, id);
      res.download(caminho);
    } catch (e) { next(e); }
  }

  static async tipos(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const result = await planejamentoService.listarTipos(tenantId);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async bloco(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { tipo, data: dataStr } = req.query as { tipo: string; data: string };
      if (!tipo || !dataStr) {
        res.status(400).json({ error: 'Parametros tipo e data sao obrigatorios' });
        return;
      }
      const result = await planejamentoService.buscarBloco(tenantId, tipo, dataStr);
      res.json(result);
    } catch (e) { next(e); }
  }
}
