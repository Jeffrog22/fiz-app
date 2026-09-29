jest.mock('../supabaseClient', () => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = { turmas: [], chamadas_log: [] };

  const match = (row: Row, f: any): boolean => {
    if (f.type === 'eq') return row[f.col] === f.val;
    if (f.type === 'notNull') return row[f.col] !== null && row[f.col] !== undefined;
    return true;
  };

  function from(table: string) {
    const state: any = {
      op: 'select', filters: [], payload: null, maybe: false, limit: null,
    };
    const b: any = {
      select() { return b; },
      eq(col: string, val: any) { state.filters.push({ type: 'eq', col, val }); return b; },
      not(col: string) { state.filters.push({ type: 'notNull', col }); return b; },
      order() { return b; },
      limit(n: number) { state.limit = n; return b; },
      range() { return b; },
      maybeSingle() { state.maybe = true; return b; },
      single() { state.maybe = true; return b; },
      insert(rows: Row | Row[]) {
        state.op = 'insert';
        state.payload = Array.isArray(rows) ? rows : [rows];
        return b;
      },
      update(vals: Row) {
        state.op = 'update';
        state.payload = vals;
        return b;
      },
      upsert(rows: Row | Row[], _opts?: any) {
        state.op = 'upsert';
        state.payload = Array.isArray(rows) ? rows : [rows];
        return b;
      },
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
      if (state.op === 'upsert') {
        for (const payload of state.payload as Row[]) {
          const idx = (store[table] || []).findIndex(
            (r) => r.tenant_id === payload.tenant_id && r.data === payload.data
              && r.grupo_id === payload.grupo_id && r.indice_aula === payload.indice_aula,
          );
          if (idx >= 0) Object.assign(store[table][idx], payload);
          else (store[table] = store[table] || []).push({ ...payload });
        }
        return { data: null, error: null };
      }
      if (state.op === 'insert') {
        for (const payload of state.payload as Row[]) (store[table] = store[table] || []).push({ ...payload });
        return { data: null, error: null };
      }
      if (state.op === 'update') {
        const alvo = (store[table] || []).filter((r: any) => state.filters.every((f: any) => match(r, f)));
        for (const row of alvo) Object.assign(row, state.payload);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    return b;
  }

  return { supabase: { from, __store: store } };
});

jest.mock('../../utils/logEngine', () => ({ registrarOperacao: jest.fn() }));

import { salvarCardBO } from '../chamadasService';
import { supabase } from '../supabaseClient';

const store = (supabase as any).__store as Record<string, any[]>;

const TURMAS = [
  { tenant_id: 't1', grupo_id: 'jeftq01', label: 'Ter/Qui', professor_id: 'jeff', horario: '07:00', faixa_etaria: 'Infantil 4-6', nivel: 'Iniciação' },
  { tenant_id: 't1', grupo_id: 'jeftq02', label: 'Ter/Qui', professor_id: 'jeff', horario: '08:00', faixa_etaria: '+ 16 anos', nivel: 'Avançado' },
  { tenant_id: 't1', grupo_id: 'marqq01', label: 'Ter/Qui', professor_id: 'mar', horario: '09:00', faixa_etaria: 'Infantil 4-6', nivel: 'Iniciação' },
];

const find = (data: string, grupo: string, idx = 0) =>
  store.chamadas_log.find((l) => l.data === data && l.grupo_id === grupo && l.indice_aula === idx);

beforeEach(() => {
  store.turmas = [...TURMAS.map((t) => ({ ...t }))];
  // log diário do dia 22 já feito por outro professor (origem manual)
  store.chamadas_log = [
    { tenant_id: 't1', data: '2026-09-22', grupo_id: 'jeftq01', indice_aula: 0, status: 'presente', origem: 'manual', tipo_ocorrencia: null },
  ];
});

describe('salvarCardBO — Atestado/Afastamento multi-dia (regressão v2.80.0)', () => {
  it('compromete a aula: cancela o índice da turma em 22 e 24/09, sobrescrevendo log manual', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_2', 'Atestado / Afastamento', 'afastamento 4 dias', false, 'jeff', 'jeftq01', undefined, 4);

    // dia 22 (terça): log manual do outro professor sobrescrito por cancelado
    const d22 = find('2026-09-22', 'jeftq01');
    expect(d22).toBeDefined();
    expect(d22!.status).toBe('cancelado');
    expect(d22!.origem).toBe('extrapolado');
    expect(d22!.tipo_ocorrencia).toBe('Atestado / Afastamento');

    // propagação: 24/09 (quinta) é dia da label Ter/Qui
    expect(find('2026-09-24', 'jeftq01')!.status).toBe('cancelado');

    // 23 (quarta) e 25 (sexta) não são dias da label
    expect(find('2026-09-23', 'jeftq01')).toBeUndefined();
    expect(find('2026-09-25', 'jeftq01')).toBeUndefined();

    // turma de outro professor não é afetada (via_2)
    expect(find('2026-09-22', 'marqq01')).toBeUndefined();
    expect(find('2026-09-24', 'marqq01')).toBeUndefined();
  });

  it('compromete o dia: cancela todas as turmas do professor no label (índices 0..N)', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_2', 'Atestado / Afastamento', 'afastamento 4 dias', true, 'jeff', 'jeftq01', undefined, 4);

    for (const dia of ['2026-09-22', '2026-09-24']) {
      expect(find(dia, 'jeftq01', 0)!.status).toBe('cancelado');
      expect(find(dia, 'jeftq02', 1)!.status).toBe('cancelado');
      expect(find(dia, 'marqq01')).toBeUndefined();
    }
    expect(find('2026-09-23', 'jeftq01')).toBeUndefined();
    expect(find('2026-09-25', 'jeftq01')).toBeUndefined();
  });

  it('sem "dias", cancela apenas o dia informado', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_2', 'Atestado / Afastamento', 'afastamento', false, 'jeff', 'jeftq01', undefined, undefined);

    expect(find('2026-09-22', 'jeftq01')!.status).toBe('cancelado');
    expect(find('2026-09-24', 'jeftq01')).toBeUndefined();
  });

  it('tipo desconhecido vira apenas metadados (sem cancelamento)', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_2', 'Tipo inexistente', 'x', false, 'jeff', 'jeftq01', undefined, 4);

    const row = find('2026-09-22', 'jeftq01');
    expect(row!.status).toBe('presente');
    expect(row!.tipo_ocorrencia).toBe('Tipo inexistente');
    expect(find('2026-09-24', 'jeftq01')).toBeUndefined();
  });
});
