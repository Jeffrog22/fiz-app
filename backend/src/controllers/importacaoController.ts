import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { importarAlunosCSV } from '../services/importacaoService';

export class ImportacaoController {
  static async importar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'Arquivo CSV não enviado' });
        return;
      }

      const result = await importarAlunosCSV(file.buffer, tenantId);

      res.json({
        message: `${result.inseridos} aluno(s) importado(s), ${result.ignorados} ignorado(s) (já existentes)`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}
