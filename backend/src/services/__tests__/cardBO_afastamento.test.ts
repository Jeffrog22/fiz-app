jest.mock('../supabaseClient', () => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = { turmas: [], chamadas_log: [], alunos: [], professores: [] };

  const match = (row: Row, f: any): boolean => {
    if (f.type === 'eq') return row[f.col] === f.val;
    if (f.type === 'notNull') return row[f.col] !== null && row[f.col] !== undefined;
    if (f.type === 'in') return Array.isArray(f.vals) && f.vals.includes(row[f.col]);
    if (f.type === 'gte') return row[f.col] >= f.val;
    if (f.type === 'lte') return row[f.col] <= f.val;
    return true;
  };

  function from(table: string) {
    const state: any = {
      op: 'select', filters: [], payload: null, maybe: false, limit: null, returning: false,
    };
    const b: any = {
      select() {
        if (state.op === 'delete') state.returning = true;
        return b;
      },
      eq(col: string, val: any) { state.filters.push({ type: 'eq', col, val }); return b; },
      not(col: string) { state.filters.push({ type: 'notNull', col }); return b; },
      in(col: string, vals: any[]) { state.filters.push({ type: 'in', col, vals }); return b; },
      gte(col: string, val: any) { state.filters.push({ type: 'gte', col, val }); return b; },
      lte(col: string, val: any) { state.filters.push({ type: 'lte', col, val }); return b; },
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
      if (state.op === 'delete') {
        const alvo = (store[table] || []).filter((r: any) => state.filters.every((f: any) => match(r, f)));
        store[table] = (store[table] || []).filter((r: any) => !state.filters.every((f: any) => match(r, f)));
        return { data: state.returning ? alvo : null, error: null };
      }
      return { data: null, error: null };
    }

    return b;
  }

  return { supabase: { from, __store: store } };
});

jest.mock('../../utils/logEngine', () => ({ registrarOperacao: jest.fn() }));

import { salvarCardBO, cancelarBO } from '../chamadasService';
import { frequenciaAluno } from '../relatoriosService';
import { supabase } from '../supabaseClient';

const store = (supabase as any).__store as Record<string, any[]>;

const A1 = '11111111-1111-4111-8111-111111111111';
const A2 = '22222222-2222-4222-8222-222222222222';
const A3 = '33333333-3333-4333-8333-333333333333';
const A4 = '44444444-4444-4444-8444-444444444444';

const TURMAS = [
  { tenant_id: 't1', grupo_id: 'jeftq01', label: 'Ter/Qui', professor_id: 'jeff', horario: '07:00', faixa_etaria: 'Infantil 4-6', nivel: 'Iniciação' },
  { tenant_id: 't1', grupo_id: 'jeftq02', label: 'Ter/Qui', professor_id: 'jeff', horario: '08:00', faixa_etaria: '+ 16 anos', nivel: 'Avançado' },
  { tenant_id: 't1', grupo_id: 'marqq01', label: 'Ter/Qui', professor_id: 'mar', horario: '09:00', faixa_etaria: 'Infantil 4-6', nivel: 'Iniciação' },
];

const ALUNOS = [
  { id: A1, tenant_id: 't1', nome: 'Aluno 1', turma_id: 'jeftq01', ativo: true },
  { id: A2, tenant_id: 't1', nome: 'Aluno 2', turma_id: 'jeftq01', ativo: true },
  { id: A3, tenant_id: 't1', nome: 'Aluno 3', turma_id: 'jeftq02', ativo: true },
  { id: A4, tenant_id: 't1', nome: 'Aluno 4', turma_id: 'marqq01', ativo: true },
];

const find = (data: string, grupo: string, idx = 0) =>
  store.chamadas_log.find((l) => l.data === data && l.grupo_id === grupo && l.indice_aula === idx);

beforeEach(() => {
  store.turmas = [...TURMAS.map((t) => ({ ...t }))];
  store.alunos = [...ALUNOS.map((a) => ({ ...a }))];
  store.professores = [];
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

describe('salvarCardBO — linhas de cancelamento por aluno (v2.82.0)', () => {
  it('via_2 com dias cria linha cancelada por aluno (além da linha da turma)', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_2', 'Atestado / Afastamento', 'afastamento 4 dias', false, 'jeff', 'jeftq01', undefined, 4);

    // alunos da turma de origem (índice 0)
    expect(find('2026-09-22', A1, 0)!.status).toBe('cancelado');
    expect(find('2026-09-22', A1, 0)!.origem).toBe('extrapolado');
    expect(find('2026-09-22', A2, 0)!.status).toBe('cancelado');
    expect(find('2026-09-24', A1, 0)!.status).toBe('cancelado');

    // segunda turma do professor (índice 1)
    expect(find('2026-09-22', A3, 1)!.status).toBe('cancelado');

    // turma de outro professor intocada
    expect(find('2026-09-22', A4, 0)).toBeUndefined();

    // dia que não é da label
    expect(find('2026-09-23', A1, 0)).toBeUndefined();
  });

  it('via_1 (geral) não cria linhas por aluno — apenas linhas de turma', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_1', 'Manutenção/Incidente', 'manutenção', true, 'jeff', 'jeftq01', true);

    // compromete o dia: turmas do label (índices 0..N) canceladas
    expect(find('2026-09-22', 'jeftq02', 1)!.status).toBe('cancelado');
    expect(find('2026-09-22', 'marqq01', 0)!.status).toBe('cancelado');

    // via_1 não força override: log manual do professor é preservado
    expect(find('2026-09-22', 'jeftq01', 0)!.status).toBe('presente');

    // nenhuma linha por aluno
    expect(find('2026-09-22', A1, 0)).toBeUndefined();
    expect(find('2026-09-22', A3, 1)).toBeUndefined();
  });

  it('outro label do mesmo professor é cancelado mesmo com índice de origem fora da faixa', async () => {
    store.turmas.push({
      tenant_id: 't1', grupo_id: 'jeffqs01', label: 'Qua/Sex', professor_id: 'jeff',
      horario: '10:00', faixa_etaria: 'Infantil 4-6', nivel: 'Iniciação',
    });

    // índice 1 existe em Ter/Qui (2 turmas), mas é fora da faixa em Qua/Sex (1 turma)
    await salvarCardBO('t1', '2026-09-22', 1, 'via_2', 'Atestado / Afastamento', 'afastamento 4 dias', false, 'jeff', 'jeftq01', undefined, 4);

    // label Qua/Sex: 23/09 é quarta-feira (dia da label)
    expect(find('2026-09-23', 'jeffqs01', 0)!.status).toBe('cancelado');
    expect(find('2026-09-22', 'jeffqs01')).toBeUndefined();
    expect(find('2026-09-24', 'jeffqs01')).toBeUndefined();

    // label Ter/Qui segue cancelada normalmente
    expect(find('2026-09-22', 'jeftq01', 0)!.status).toBe('cancelado');
    expect(find('2026-09-22', 'jeftq02', 1)!.status).toBe('cancelado');
  });
});

describe('cancelarBO — remove linhas da turma e por aluno (v2.82.0)', () => {
  it('apaga as linhas do dia nas turmas e nos alunos, mantendo os demais dias', async () => {
    await salvarCardBO('t1', '2026-09-22', 0, 'via_2', 'Atestado / Afastamento', 'afastamento 4 dias', false, 'jeff', 'jeftq01', undefined, 4);

    expect(find('2026-09-22', A1, 0)).toBeDefined();
    expect(find('2026-09-24', A1, 0)).toBeDefined();

    const { count } = await cancelarBO('t1', '2026-09-22', 0, 'jeftq01');

    // dia 22: turma origem + demais turmas do professor + linhas por aluno
    expect(find('2026-09-22', 'jeftq01', 0)).toBeUndefined();
    expect(find('2026-09-22', 'jeftq02', 1)).toBeUndefined();
    expect(find('2026-09-22', A1, 0)).toBeUndefined();
    expect(find('2026-09-22', A2, 0)).toBeUndefined();
    expect(find('2026-09-22', A3, 1)).toBeUndefined();

    // 24/09 permanece (a limpeza é por dia)
    expect(find('2026-09-24', 'jeftq01', 0)!.status).toBe('cancelado');
    expect(find('2026-09-24', A1, 0)!.status).toBe('cancelado');

    expect(count).toBe(5);
  });
});

describe('frequenciaAluno — linhas por aluno não duplicam o cancelamento (v2.82.0)', () => {
  it('conta o cancelamento uma única vez quando existem linha da turma + linha por aluno', async () => {
    store.chamadas_log = [
      { tenant_id: 't1', data: '2026-09-22', grupo_id: 'jeftq01', indice_aula: 0, status: 'cancelado', origem: 'extrapolado', tipo_ocorrencia: 'Atestado / Afastamento' },
      { tenant_id: 't1', data: '2026-09-22', grupo_id: A1, indice_aula: 0, status: 'cancelado', origem: 'extrapolado', tipo_ocorrencia: 'Atestado / Afastamento' },
      { tenant_id: 't1', data: '2026-09-24', grupo_id: A1, indice_aula: 0, status: 'presente', origem: 'manual' },
    ];

    const res = await frequenciaAluno('t1', 0, 0);
    const a1 = res.find((r) => r.aluno_id === A1)!;
    const a2 = res.find((r) => r.aluno_id === A2)!;

    // A1: cancelado conta 1x (linha por aluno ignorada, linha da turma distribui) — sem duplicar
    expect(a1.cancelado).toBe(1);
    expect(a1.presente).toBe(1);
    expect(a1.total_aulas).toBe(1);

    // A2: recebe o cancelamento apenas via linha da turma
    expect(a2.cancelado).toBe(1);
    expect(a2.total_aulas).toBe(0);
  });
});
