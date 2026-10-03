import { describe, it, expect } from 'vitest';
import { mesclarLogsServidor, type LogsIndex } from '../logsMerge';
import type { ChamadaLog } from '../../types';

const log = (p: Partial<ChamadaLog>): ChamadaLog => ({
  id: 'x',
  tenant_id: 'bela-vista',
  data: '2026-09-22',
  indice_aula: 0,
  ...p,
} as ChamadaLog);

const indice = (...entries: Array<[string, string, number, ChamadaLog]>): LogsIndex => {
  const idx: LogsIndex = {};
  for (const [g, d, i, l] of entries) {
    if (!idx[g]) idx[g] = {};
    if (!idx[g][d]) idx[g][d] = {};
    idx[g][d][i] = l;
  }
  return idx;
};

describe('mesclarLogsServidor', () => {
  it('descarta linha local extrapolada que o servidor apagou (CardAula voltou a AULA_NORMAL)', () => {
    const prev = indice(['jeftq01', '2026-09-22', 0, log({ grupo_id: 'jeftq01', status: 'cancelado', origem: 'extrapolado' })]);
    const doServidor: LogsIndex = {};
    expect(mesclarLogsServidor(prev, doServidor)).toEqual({});
  });

  it('mantém linha local manual ausente do servidor (escrita otimista pendente)', () => {
    const pendente = log({ grupo_id: 'aluno-1', status: 'presente', origem: 'manual' });
    const prev = indice(['aluno-1', '2026-09-22', 0, pendente]);
    const merged = mesclarLogsServidor(prev, {});
    expect(merged['aluno-1']['2026-09-22'][0]).toBe(pendente);
  });

  it('local manual não é sobrescrito pelo servidor, exceto quando o servidor traz cancelado', () => {
    const local = log({ grupo_id: 'aluno-1', status: 'presente', origem: 'manual' });
    const prev = indice(['aluno-1', '2026-09-22', 0, local]);
    const servidor = indice(['aluno-1', '2026-09-22', 0, log({ grupo_id: 'aluno-1', status: 'justificado', origem: 'extrapolado' })]);

    expect(mesclarLogsServidor(prev, servidor)['aluno-1']['2026-09-22'][0]).toBe(local);

    const servidorCancelado = indice(['aluno-1', '2026-09-22', 0, log({ grupo_id: 'aluno-1', status: 'cancelado', origem: 'extrapolado' })]);
    expect(mesclarLogsServidor(prev, servidorCancelado)['aluno-1']['2026-09-22'][0].status).toBe('cancelado');
  });

  it('novas linhas do servidor entram no estado local', () => {
    const servidor = indice(['jeftq01', '2026-09-22', 1, log({ grupo_id: 'jeftq01', status: 'cancelado', origem: 'extrapolado' })]);
    const merged = mesclarLogsServidor({}, servidor);
    expect(merged['jeftq01']['2026-09-22'][1].status).toBe('cancelado');
  });

  it('não muta o estado local anterior', () => {
    const prev = indice(['jeftq01', '2026-09-22', 0, log({ grupo_id: 'jeftq01', status: 'cancelado', origem: 'extrapolado' })]);
    const snapshot = JSON.parse(JSON.stringify(prev));
    mesclarLogsServidor(prev, {});
    expect(prev).toEqual(snapshot);
  });
});
