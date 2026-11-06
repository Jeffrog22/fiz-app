jest.mock('../supabaseClient', () => {
  const state: any = {
    eq: [],
    in: [],
    order: [],
    rows: [],
    error: null,
  };

  function from(_table: string) {
    return {
      select() {
        return {
          eq(col: string, val: any) {
            state.eq.push([col, val]);
            return {
              in(col2: string, vals: any[]) {
                state.in.push([col2, vals]);
                return {
                  order(col3: string, opts: any) {
                    state.order.push([col3, opts]);
                    return Promise.resolve({ data: state.rows, error: state.error });
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  return { supabase: { from, __state: state } };
});

import { supabase } from '../supabaseClient';
import { listarPeriodosPorAlunosService } from '../enrollmentService';

const state = (supabase as any).__state;

describe('listarPeriodosPorAlunosService', () => {
  beforeEach(() => {
    state.eq = [];
    state.in = [];
    state.order = [];
    state.rows = [];
    state.error = null;
  });

  it('retorna vazio sem consultar quando não há ids', async () => {
    const resultado = await listarPeriodosPorAlunosService([], 'tenant-1');

    expect(resultado).toEqual([]);
    expect(state.in).toHaveLength(0);
  });

  it('filtra por tenant, deduplica ids e ordena por data_inicio desc', async () => {
    state.rows = [
      { id: 'ep-1', aluno_id: 'a', turma_id: 'jeftq01', data_inicio: '2026-11-01', data_fim: null },
    ];

    const resultado = await listarPeriodosPorAlunosService(['a', 'a', 'b'], 'tenant-1');

    expect(resultado).toEqual(state.rows);
    expect(state.eq).toEqual([['tenant_id', 'tenant-1']]);
    expect(state.in).toEqual([['aluno_id', ['a', 'b']]]);
    expect(state.order).toEqual([['data_inicio', { ascending: false }]]);
  });

  it('consulta em lotes de 100 alunos', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `aluno-${i}`);

    await listarPeriodosPorAlunosService(ids, 'tenant-1');

    expect(state.in).toHaveLength(2);
    expect(state.in[0][1]).toHaveLength(100);
    expect(state.in[1][1]).toHaveLength(1);
  });

  it('lança erro quando o Supabase falha', async () => {
    state.error = { message: 'boom' };

    await expect(
      listarPeriodosPorAlunosService(['a'], 'tenant-1')
    ).rejects.toThrow('Erro ao buscar períodos dos alunos');
  });
});
