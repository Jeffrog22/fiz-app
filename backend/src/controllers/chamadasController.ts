import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import * as chamadasService from '../services/chamadasService';
import * as cardAulaService from '../services/cardAulaService';
import * as extrapolarService from '../services/extrapolarService';

export class ChamadasController {
  static async composicaoHistorica(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { grupo_id, mes, ano } = req.body;
      const result = await chamadasService.listarComposicaoHistorica(grupo_id, mes, ano, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async listarPorData(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data } = req.params;
      const result = await chamadasService.listarPorData(data, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async listarPorPeriodo(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { inicio, fim } = req.query;
      const result = await chamadasService.listarPorPeriodo(inicio as string, fim as string, tenantId);
      if (process.env.NODE_ENV !== 'production') {
        const turmaLogs = result.filter((r: any) =>
          r.grupo_id && !r.grupo_id.includes('-') && r.grupo_id.length < 20
        );
        if (turmaLogs.length > 0) {
          console.log('[listarPorPeriodo] Turma-level logs no result:', JSON.stringify(turmaLogs));
        }
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async salvar(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      await chamadasService.salvar(req.body, tenantId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  static async aplicarEventoCalendario(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data, tipo } = req.body;
      const result = await chamadasService.aplicarEventoCalendario(data, tipo, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async extrapolarPresenca(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data, indice_aula } = req.body;
      const result = await chamadasService.extrapolarPresenca(data, indice_aula, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async salvarCardAula(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data, indice_aula, grupo_id, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima, sensacao, status_sugerido, motivo_sugerido } = req.body;
      console.log('[salvarCardAula] Recebido:', { data, indice_aula, grupo_id, status_sugerido, motivo_sugerido, temperatura_piscina, cloro_ppm, condicao_clima });

      const hash = await cardAulaService.salvarCardAula(tenantId, data, indice_aula || 0, temperatura_externa, temperatura_piscina, cloro_ppm, condicao_clima, sensacao, status_sugerido, motivo_sugerido);

      // Auto-extrapolar conforme inputs brutos usando motor climatico unificado
      if (grupo_id) {
        const rawInputs = { condicao_clima, sensacao, cloro_ppm, temperatura_piscina };
        console.log('[salvarCardAula] Disparando extrapolacao unificada para grupo_id:', grupo_id, 'data:', data, 'indice:', indice_aula, 'inputs:', rawInputs, 'status_sugerido:', status_sugerido);

        if (status_sugerido === 'AULA_CANCELADA') {
          try {
            const result = await extrapolarService.extrapolarCancelamento(tenantId, data, grupo_id, indice_aula || 0, 12, motivo_sugerido || '', undefined, undefined, temperatura_piscina, condicao_clima, sensacao, cloro_ppm);
            console.log('[salvarCardAula] Resultado extrapolarCancelamento:', result);
          } catch (extError) {
            console.error('[salvarCardAula] Erro ao extrapolar cancelamento:', extError);
          }
        } else if (status_sugerido === 'FALTA_JUSTIFICADA') {
          try {
            const result = await extrapolarService.extrapolarJustificativa(tenantId, data, grupo_id, indice_aula || 0, 12, motivo_sugerido || '', temperatura_piscina, condicao_clima, sensacao, cloro_ppm);
            console.log('[salvarCardAula] Resultado extrapolarJustificativa:', result);
          } catch (extError) {
            console.error('[salvarCardAula] Erro ao extrapolar justificativa:', extError);
          }
        } else if (status_sugerido === 'AULA_NORMAL') {
          // Cleanup: remove extrapolated logs for all turmas in this label at this indice
          try {
            const { data: turmaOrigem } = await supabase
              .from('turmas')
              .select('label')
              .eq('grupo_id', grupo_id)
              .eq('tenant_id', tenantId)
              .maybeSingle();

            if (turmaOrigem?.label) {
              const { data: turmasLabel } = await supabase
                .from('turmas')
                .select('grupo_id')
                .eq('tenant_id', tenantId)
                .eq('label', turmaOrigem.label);

              const grupoIds = (turmasLabel || []).map((t: any) => t.grupo_id);
              if (grupoIds.length > 0) {
                const idx = indice_aula ?? 0;
                  await supabase
                    .from('chamadas_log')
                    .delete()
                    .eq('tenant_id', tenantId)
                    .eq('data', data)
                    .eq('indice_aula', idx)
                    .in('grupo_id', grupoIds)
                    .eq('origem', 'extrapolado')
                    .is('tipo_ocorrencia', null);
                console.log('[salvarCardAula] Logs extrapolados limpos para label:', turmaOrigem.label, 'indice:', idx);
              }
            }
          } catch (err) {
            console.error('[salvarCardAula] Erro ao limpar logs extrapolados:', err);
          }
        }
      } else {
        console.log('[salvarCardAula] grupo_id vazio — extrapolacao ignorada');
      }

      res.json({ ok: true, hash });
    } catch (error) {
      next(error);
    }
  }

  static async salvarCardBO(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data, indice_aula, via, tipo_ocorrencia, motivo, compromete_dia, grupo_id } = req.body;
      await chamadasService.salvarCardBO(tenantId, data, indice_aula, via, tipo_ocorrencia, motivo, compromete_dia, req.professorId, grupo_id);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  static async registrarLogAcesso(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { professorId } = req;
      const ip = req.ip || req.socket.remoteAddress || 'desconhecido';
      await chamadasService.registrarLogAcesso(tenantId, professorId, ip);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  static async obterCardAula(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data } = req.params;
      // Leitura nova: busca do card_aula (documento diario)
      const result = await cardAulaService.obterCardAula(data, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async obterCardAulaLegado(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { data } = req.params;
      const indice_aula = parseInt(req.query.indice_aula as string) || 0;
      const result = await chamadasService.obterCardAula(data, indice_aula, tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async obterClima(_req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chamadasService.obterClima();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async obterLogsAcesso(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await chamadasService.obterLogsAcesso(tenantId, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default ChamadasController;
