import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { gerarFrequenciaXLSX, gerarVagasXLSX } from '../services/exportacaoService';

export class ExportacaoController {
  static async exportarFrequencia(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { professor_id, label, mes, ano } = req.body;

      if (!professor_id || !label || !mes || !ano) {
        res.status(400).json({ error: 'professor_id, label, mes e ano são obrigatórios' });
        return;
      }

      const buffer = await gerarFrequenciaXLSX(tenantId, professor_id, label, parseInt(mes, 10), parseInt(ano, 10));
      const filename = `fiz_frequencia_${professor_id}_${label}_${mes}_${ano}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  static async exportarVagas(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const buffer = await gerarVagasXLSX(tenantId);
      const agora = new Date();
      const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
      const filename = `fiz_relatorio_vagas_${data}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
