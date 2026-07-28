import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { gerarFrequenciaXLSX, gerarVagasXLSX, gerarCancelamentosXLSX } from '../services/exportacaoService';

export class ExportacaoController {
  static async exportarFrequencia(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { professor_id, label, mes, ano } = req.body;

      if (!professor_id || !mes || !ano) {
        res.status(400).json({ error: 'professor_id, mes e ano são obrigatórios' });
        return;
      }

      const buffer = await gerarFrequenciaXLSX(tenantId, professor_id, label || undefined, parseInt(mes, 10), parseInt(ano, 10));
      const labelPart = label ? `_${label}` : '';
      const filename = `fiz_frequencia_${professor_id}${labelPart}_${mes}_${ano}.xlsx`;

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

  static async exportarCancelamentos(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { professor_id, label, mes, ano, tipo_select } = req.body;

      if (!mes || !ano) {
        res.status(400).json({ error: 'mes e ano são obrigatórios' });
        return;
      }

      const buffer = await gerarCancelamentosXLSX(
        tenantId,
        professor_id || undefined,
        label || undefined,
        parseInt(mes, 10),
        parseInt(ano, 10),
        tipo_select || undefined,
      );
      const filename = `fiz_cancelamentos_${mes}_${ano}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
