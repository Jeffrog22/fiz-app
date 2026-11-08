jest.mock('../supabaseClient', () => {
  const state: any = {
    singleResponses: [],
    updates: [],
  };

  function from(table: string) {
    const query: any = {
      table,
      select() {
        return query;
      },
      update(values: any) {
        state.updates.push({ table, values });
        return query;
      },
      delete() {
        return query;
      },
      eq() {
        return query;
      },
      in() {
        return query;
      },
      is() {
        return query;
      },
      order() {
        return query;
      },
      single() {
        return Promise.resolve({ data: state.singleResponses.shift() ?? null, error: null });
      },
      maybeSingle() {
        return Promise.resolve({ data: state.singleResponses.shift() ?? null, error: null });
      },
      then(resolve: any, reject: any) {
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      },
    };
    return query;
  }

  return { supabase: { from, __state: state } };
});

jest.mock('../enrollmentService', () => ({
  iniciarPeriodoService: jest.fn().mockResolvedValue({}),
}));

import { supabase } from '../supabaseClient';
import { iniciarPeriodoService } from '../enrollmentService';
import { restaurar } from '../exclusoesService';

const state = (supabase as any).__state;
const mockIniciar = iniciarPeriodoService as jest.Mock;

describe('restaurar', () => {
  beforeEach(() => {
    state.singleResponses = [];
    state.updates = [];
    mockIniciar.mockClear();
  });

  it('usa a turma atual do aluno quando nenhuma turma é informada', async () => {
    state.singleResponses = [
      { aluno_id: 'aluno-1' },
      { turma_id: 'jeftq02', nivel: 'Nível 2' },
    ];

    await restaurar('exc-1', 'tenant-1');

    expect(mockIniciar).toHaveBeenCalledWith(
      'aluno-1',
      'jeftq02',
      'Nível 2',
      'reativacao',
      'tenant-1',
    );
  });

  it('usa a turma informada quando a restauração escolhe outra turma', async () => {
    state.singleResponses = [
      { aluno_id: 'aluno-1' },
      { turma_id: 'jeftq02', nivel: 'Nível 2' },
    ];

    await restaurar('exc-1', 'tenant-1', 'jeftq05');

    expect(mockIniciar).toHaveBeenCalledWith(
      'aluno-1',
      'jeftq05',
      'Nível 2',
      'reativacao',
      'tenant-1',
    );
  });

  it('mantém turma nula quando o aluno não tem turma', async () => {
    state.singleResponses = [
      { aluno_id: 'aluno-2' },
      { turma_id: null, nivel: null },
    ];

    await restaurar('exc-2', 'tenant-1');

    expect(mockIniciar).toHaveBeenCalledWith(
      'aluno-2',
      null,
      null,
      'reativacao',
      'tenant-1',
    );
  });

  it('usa transferencia_externa como motivo quando veio de outra piscina', async () => {
    state.singleResponses = [
      { aluno_id: 'aluno-3' },
      { turma_id: 'jeftq01', nivel: 'Nível 1' },
    ];

    await restaurar('exc-3', 'tenant-1', undefined, true);

    expect(mockIniciar).toHaveBeenCalledWith(
      'aluno-3',
      'jeftq01',
      'Nível 1',
      'transferencia_externa',
      'tenant-1',
    );
  });
});
