import type { ChamadaLog } from '../types';

export type LogsIndex = Record<string, Record<string, Record<number, ChamadaLog>>>;

/**
 * Merge do estado local de logs com o que veio do servidor.
 *
 * - Base: servidor (fonte da verdade).
 * - Local manual não é sobrescrito pelo servidor, exceto quando o servidor traz
 *   `status === 'cancelado'` (prioridade herdada do carregarLogs original).
 * - Local ausente no servidor só é mantido se for `origem === 'manual'`
 *   (escrita otimista ainda pendente de envio). Linhas `extrapolado`/`calendario`
 *   que o servidor apagou (ex.: CardAula voltou a AULA_NORMAL) são descartadas —
 *   antes ficavam órfãs e o grid continuava exibindo "C".
 */
export function mesclarLogsServidor(prev: LogsIndex, doServidor: LogsIndex): LogsIndex {
  const merged: LogsIndex = {};

  const set = (grupoId: string, data: string, idx: number, log: ChamadaLog) => {
    if (!merged[grupoId]) merged[grupoId] = {};
    if (!merged[grupoId][data]) merged[grupoId][data] = {};
    merged[grupoId][data][idx] = log;
  };

  for (const [grupoId, datas] of Object.entries(doServidor)) {
    for (const [data, indices] of Object.entries(datas)) {
      for (const [indice, log] of Object.entries(indices)) {
        set(grupoId, data, Number(indice), log);
      }
    }
  }

  for (const [grupoId, datas] of Object.entries(prev)) {
    for (const [data, indices] of Object.entries(datas)) {
      for (const [indice, log] of Object.entries(indices)) {
        const idx = Number(indice);
        const servidorLog = merged[grupoId]?.[data]?.[idx];
        if (!servidorLog) {
          if (log.origem === 'manual') set(grupoId, data, idx, log);
        } else if (log.origem === 'manual' && servidorLog.status !== 'cancelado') {
          set(grupoId, data, idx, log);
        }
      }
    }
  }

  return merged;
}
