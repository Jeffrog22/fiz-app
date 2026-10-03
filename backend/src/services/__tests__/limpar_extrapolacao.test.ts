jest.mock('../supabaseClient', () => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = { turmas: [], chamadas_log: [] };

  const match = (row: Row, f: any): boolean => {
    if (f.type === 'eq') return row[f.col] === f.val;
    if (f.type === 'in') return Array.isArray(f.vals) && f.vals.includes(row[f.col]);
    if (f.type === 'is') {
      const valor = row[f.col];
      return f.val === null ? valor === null || valor === undefined : valor === f.val;
    }
    return true;
  };

  function from(table: string) {
    const state: any = { op: 'select', filters: [], maybe: false, returning: false };
    const b: any = {
      select() {
        if (state.op === 'delete') state.returning = true;
        return b;
      },
      eq(col: string, val: any) { state.filters.push({ type: 'eq', col, val }); return b; },
      in(col: string, vals: any[]) { state.filters.push({ type: 'in', col, vals }); return b; },
      is(col: string, val: any) { state.filters.push({ type: 'is', col, val }); return b; },
      maybeSingle() { state.maybe = true; return b; },
      delete() { state.op = 'delete'; return b; },
      then(resolve: any, reject: any) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };

    function execute(): { data: any; error: null } {
      const rows = (store[table] || []).filter((r: any) => state.filters.every((f: any) => match(r, f)));
      if (state.op === 'select') {
        return { data: state.maybe ? (rows[0] ?? null) : rows, error: null };
      }
      if (state.op === 'delete') {
        store[table] = (store[table] || []).filter((r: any) => !state.filters.every((f: any) => match(r, f)));
        return { data: state.returning ? rows : null, error: null };
      }
      return { data: null, error: null };
    }

    return b;
  }

  return { supabase: { from, __store: store } };
});

jest.mock('../../utils/logEngine', () => ({ registrarOperacao: jest.fn() }));

import { limparExtrapolacaoNormal } from '../chamadasService';
import { supabase } from '../supabaseClient';

const store = (supabase as any).__store as Record<string, any[]>;

const DATA = '2026-09-22';

const row = (p: Partial<any>) => ({ tenant_id: 't1', data: DATA, tipo_ocorrencia: null, ...p });

beforeEach(() => {
  store.turmas = [
    { tenant_id: 't1', grupo_id: 'jeftq01', label: 'Ter/Qui', professor_id: 'jeff', horario: '07:00' },
    { tenant_id: 't1', grupo_id: 'jeftq02', label: 'Ter/Qui', professor_id: 'jeff', horario: '08:00' },
    { tenant_id: 't1', grupo_id: 'outqq01', label: 'Qua/Sex', professor_id: 'out', horario: '07:00' },
  ];
  store.chamadas_log = [
    // cancelamento climático em TODOS os índices do label (bug: antes só 1 índice era limpo)
    row({ grupo_id: 'jeftq01', indice_aula: 0, status: 'cancelado', origem: 'extrapolado' }),
    row({ grupo_id: 'jeftq02', indice_aula: 1, status: 'cancelado', origem: 'extrapolado' }),
    // justificativa climática também deve sair no AULA_NORMAL
    row({ grupo_id: 'jeftq01', indice_aula: 1, status: 'justificado', origem: 'extrapolado' }),
    // BO (tipo_ocorrencia) deve permanecer
    row({ grupo_id: 'jeftq01', indice_aula: 0, status: 'cancelado', origem: 'extrapolado', tipo_ocorrencia: 'Manutenção/Incidente' }),
    // log manual deve permanecer
    row({ grupo_id: 'jeftq01', indice_aula: 0, status: 'presente', origem: 'manual' }),
    // extrapolação de presença (origem extrapolado, status presente) deve permanecer
    row({ grupo_id: 'jeftq02', indice_aula: 0, status: 'presente', origem: 'extrapolado' }),
    // outro label não é afetado
    row({ grupo_id: 'outqq01', indice_aula: 0, status: 'cancelado', origem: 'extrapolado' }),
  ];
});

describe('limparExtrapolacaoNormal (CardAula → AULA_NORMAL)', () => {
  it('remove o cancelamento de todas as turmas do label em todos os índices', async () => {
    const removidos = await limparExtrapolacaoNormal('t1', DATA, 'jeftq01');
    expect(removidos).toBe(3);

    const doLabel = store.chamadas_log.filter((l) => l.grupo_id === 'jeftq01' || l.grupo_id === 'jeftq02');
    expect(doLabel.find((l) => l.status === 'cancelado' && l.tipo_ocorrencia === null)).toBeUndefined();
    expect(doLabel.find((l) => l.status === 'justificado')).toBeUndefined();
  });

  it('preserva BO, log manual, extrapolação de presença e outro label', async () => {
    await limparExtrapolacaoNormal('t1', DATA, 'jeftq01');

    expect(store.chamadas_log.find((l) => l.tipo_ocorrencia === 'Manutenção/Incidente')).toBeDefined();
    expect(store.chamadas_log.find((l) => l.origem === 'manual')).toBeDefined();
    expect(store.chamadas_log.find((l) => l.grupo_id === 'jeftq02' && l.status === 'presente')).toBeDefined();
    expect(store.chamadas_log.find((l) => l.grupo_id === 'outqq01')).toBeDefined();
  });

  it('não faz nada quando a turma não tem label', async () => {
    const antes = store.chamadas_log.length;
    const removidos = await limparExtrapolacaoNormal('t1', DATA, 'naoexiste');
    expect(removidos).toBe(0);
    expect(store.chamadas_log.length).toBe(antes);
  });
});
