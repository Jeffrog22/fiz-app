jest.mock('../supabaseClient', () => ({ supabase: {}, default: {} }));

import { montarLinhasBO } from '../exportacaoService';
import type { ChamadaLog } from '../../types';

const log = (p: Partial<ChamadaLog>): ChamadaLog => ({
  id: 'x',
  tenant_id: 'bela-vista',
  data: '2026-09-01',
  indice_aula: 0,
  ...p,
} as ChamadaLog);

describe('montarLinhasBO', () => {
  it('filtra pela turma e formata "dd - tipo: motivo"', () => {
    const logs = [
      log({ data: '2026-09-05', grupo_id: 'jeftq03', tipo_ocorrencia: 'Manutenção/Incidente', motivo: 'vazamento no filtro' }),
      log({ data: '2026-09-12', grupo_id: 'jeftq03', tipo_ocorrencia: 'Reunião', motivo: '' }),
      log({ data: '2026-09-12', grupo_id: 'outra-turma', tipo_ocorrencia: 'Reunião', motivo: 'de outra turma' }),
      log({ data: '2026-09-12', grupo_id: 'jeftq03', status: 'presente', tipo_ocorrencia: undefined }),
    ];
    expect(montarLinhasBO(logs, 'jeftq03')).toEqual([
      '5 - Manutenção/Incidente: vazamento no filtro',
      '12 - Reunião',
    ]);
  });

  it('deduplica cancelamento com múltiplos índices de aula', () => {
    const logs = [
      log({ data: '2026-09-08', grupo_id: 'jeftq03', indice_aula: 0, status: 'cancelado', tipo_ocorrencia: 'Raios e Trovões', motivo: 'tempestade' }),
      log({ data: '2026-09-08', grupo_id: 'jeftq03', indice_aula: 1, status: 'cancelado', tipo_ocorrencia: 'Raios e Trovões', motivo: 'tempestade' }),
      log({ data: '2026-09-08', grupo_id: 'jeftq03', indice_aula: 2, status: 'cancelado', tipo_ocorrencia: 'Raios e Trovões', motivo: 'outro texto' }),
    ];
    expect(montarLinhasBO(logs, 'jeftq03')).toEqual([
      '8 - Raios e Trovões: tempestade',
      '8 - Raios e Trovões: outro texto',
    ]);
  });

  it('ordena por data ascendente', () => {
    const logs = [
      log({ data: '2026-09-20', grupo_id: 'jeftq01', tipo_ocorrencia: 'Secretaria' }),
      log({ data: '2026-09-03', grupo_id: 'jeftq01', tipo_ocorrencia: 'Médico pessoal', motivo: 'atestado' }),
    ];
    expect(montarLinhasBO(logs, 'jeftq01')).toEqual([
      '3 - Médico pessoal: atestado',
      '20 - Secretaria',
    ]);
  });

  it('ignora logs sem grupo_id da turma e sem tipo_ocorrencia', () => {
    const logs = [
      log({ data: '2026-09-05', grupo_id: null as any, tipo_ocorrencia: 'Reunião' }),
      log({ data: '2026-09-05', grupo_id: 'jeftq03', status: 'justificado', motivo: 'Consulta médica' }),
      log({ data: '2026-09-05', grupo_id: 'aaaaaaaa-uuid-aluno', tipo_ocorrencia: 'Reunião' }),
    ];
    expect(montarLinhasBO(logs, 'jeftq03')).toEqual([]);
  });
});
