import { Response, NextFunction } from 'express';
import { TenantRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import * as chamadasService from '../services/chamadasService';
import * as cardAulaService from '../services/cardAulaService';
import * as extrapolarService from '../services/extrapolarService';

export class ChamadasController {
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

      // Auto-extrapolar conforme status sugerido
      if (grupo_id) {
        if (status_sugerido === 'AULA_CANCELADA') {
          console.log('[salvarCardAula] Disparando extrapolarCancelamento para grupo_id:', grupo_id, 'data:', data, 'indice:', indice_aula);
          try {
            const result = await extrapolarService.extrapolarCancelamento(tenantId, data, grupo_id, indice_aula || 0, 12, motivo_sugerido || '', undefined, undefined, temperatura_piscina);
            console.log('[salvarCardAula] Resultado extrapolarCancelamento:', result);
          } catch (extError) {
            console.error('[salvarCardAula] Erro ao extrapolar cancelamento:', extError);
          }
        } else if (status_sugerido === 'FALTA_JUSTIFICADA') {
          console.log('[salvarCardAula] Disparando extrapolarJustificativa para grupo_id:', grupo_id, 'data:', data, 'indice:', indice_aula);
          try {
            const result = await extrapolarService.extrapolarJustificativa(tenantId, data, grupo_id, indice_aula || 0, 12, motivo_sugerido || '', temperatura_piscina);
            console.log('[salvarCardAula] Resultado extrapolarJustificativa:', result);
          } catch (extError) {
            console.error('[salvarCardAula] Erro ao extrapolar justificativa:', extError);
          }
        } else if (status_sugerido === 'AULA_NORMAL') {
          console.log('[salvarCardAula] AULA_NORMAL — limpando logs extrapolados anteriores para o label');
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
                  .eq('origem', 'extrapolado');

                const { data: alunos } = await supabase
                  .from('alunos')
                  .select('id')
                  .eq('tenant_id', tenantId)
                  .in('turma_id', grupoIds)
                  .eq('ativo', true);

                if (alunos && alunos.length > 0) {
                  const alunoIds = alunos.map((a: any) => a.id);
                  await supabase
                    .from('chamadas_log')
                    .delete()
                    .eq('tenant_id', tenantId)
                    .eq('data', data)
                    .eq('indice_aula', idx)
                    .in('grupo_id', alunoIds)
                    .eq('origem', 'extrapolado');
                }
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
