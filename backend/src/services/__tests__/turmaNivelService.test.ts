jest.mock('../supabaseClient', () => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = {
    turma_nivel_vigencia: [],
    transferencia_nivel_pendencia: [],
    transferencia_nivel_pendencia_lote: [],
    turmas: [],
    transferencia_lote: [],
  };

  const match = (row: Row, f: any): boolean => {
    if (f.type === 'eq') return row[f.col] === f.val;
    if (f.type === 'is') return row[f.col] === f.val;
    if (f.type === 'notNull') return row[f.col] !== null && row[f.col] !== undefined;
    if (f.type === 'in') return Array.isArray(f.vals) && f.vals.includes(row[f.col]);
    if (f.type === 'lte') return row[f.col] <= f.val;
    if (f.type === 'gte') return row[f.col] >= f.val;
    return true;
  };

  function from(table: string) {
    const state: any = {
      op: 'select', filters: [], payload: null, maybe: false, limit: null, returning: false,
    };
    const b: any = {
      select() { if (state.op === 'delete') state.returning = true; return b; },
      eq(col: string, val: any) { state.filters.push({ type: 'eq', col, val }); return b; },
      is(col: string, val: any) { state.filters.push({ type: 'is', col, val }); return b; },
      not(col: string) { state.filters.push({ type: 'notNull', col }); return b; },
      in(col: string, vals: any[]) { state.filters.push({ type: 'in', col, vals }); return b; },
      gte(col: string, val: any) { state.filters.push({ type: 'gte', col, val }); return b; },
      lte(col: string, val: any) { state.filters.push({ type: 'lte', col, val }); return b; },
      order() { return b; },
      limit(n: number) { state.limit = n; return b; },
      range() { return b; },
      maybeSingle() { state.maybe = true; return b; },
      single() { state.maybe = true; return b; },
      or() { return b; },
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
            (r) => r.tenant_id === payload.tenant_id && r.pendencia_id === payload.pendencia_id && r.lote_id === payload.lote_id,
          );
          if (idx >= 0) Object.assign(store[table][idx], payload);
          else (store[table] = store[table] || []).push({ ...payload });
        }
        return { data: null, error: null };
      }
      if (state.op === 'insert') {
        const inseridos: Row[] = [];
        for (const payload of state.payload as Row[]) {
          const row: Row = { ...payload };
          if (!row.id) row.id = 'id-' + Math.random().toString(36).slice(2);
          inseridos.push(row);
          (store[table] = store[table] || []).push(row);
        }
        return { data: state.maybe ? (inseridos[0] ?? null) : inseridos, error: null };
      }
      if (state.op === 'update') {
        const alvo = (store[table] || []).filter((r: any) => state.filters.every((f: any) => match(r, f)));
        const atualizados: Row[] = [];
        for (const row of alvo) {
          Object.assign(row, state.payload);
          atualizados.push({ ...row });
        }
        return { data: state.maybe ? (atualizados[0] ?? null) : atualizados, error: null };
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

import {
  criarOuReusarPropostaNivelService,
  liberarPropostaDoLoteService,
  listarPendenciasNivelService,
  listarVigenciasService,
  nivelVigenteService,
  registrarVigenciaNivelService,
  resolverNivelPorData,
  shiftDia,
} from '../turmaNivelService';
import { supabase } from '../supabaseClient';

const store = (supabase as any).__store as Record<string, any[]>;

const TENANT = 't1';

beforeEach(() => {
  store.turma_nivel_vigencia = [];
  store.transferencia_nivel_pendencia = [];
  store.transferencia_nivel_pendencia_lote = [];
  store.transferencia_lote = [];
});

describe('vigencia de nivel', () => {
  it('shiftDia desloca a data preservando o formato', () => {
    expect(shiftDia('2026-12-01', -1)).toBe('2026-11-30');
    expect(shiftDia('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftDia('2026-12-01', 1)).toBe('2026-12-02');
  });

  it('nivelVigenteService usa o nivel atual quando nao ha vigencia', async () => {
    const mapa = await nivelVigenteService(
      TENANT,
      [{ grupo_id: 'jeftq01', nivel: '4' }],
      '2026-11-01',
    );
    expect(mapa.get('jeftq01')).toBe('4');
  });

  it('nivelVigenteService devolve o nivel vigente na data consultada', async () => {
    store.turma_nivel_vigencia = [
      { id: 'v1', tenant_id: TENANT, turma_grupo_id: 'jeftq01', nivel: '4', data_inicio: '2026-01-01', data_fim: '2026-11-30' },
      { id: 'v2', tenant_id: TENANT, turma_grupo_id: 'jeftq01', nivel: '3', data_inicio: '2026-12-01', data_fim: null },
    ];

    const novembro = await nivelVigenteService(TENANT, [{ grupo_id: 'jeftq01', nivel: '3' }], '2026-11-01');
    const dezembro = await nivelVigenteService(TENANT, [{ grupo_id: 'jeftq01', nivel: '3' }], '2026-12-01');

    expect(novembro.get('jeftq01')).toBe('4');
    expect(dezembro.get('jeftq01')).toBe('3');
  });

  it('registrarVigenciaNivelService fecha o intervalo anterior e abre o novo', async () => {
    await registrarVigenciaNivelService(TENANT, 'jeftq01', '4', '2026-01-01');
    await registrarVigenciaNivelService(TENANT, 'jeftq01', '3', '2026-12-01');

    expect(store.turma_nivel_vigencia).toHaveLength(2);
    expect(store.turma_nivel_vigencia[0].data_fim).toBe('2026-11-30');
    expect(store.turma_nivel_vigencia[1].nivel).toBe('3');
    expect(store.turma_nivel_vigencia[1].data_fim).toBeNull();
  });

  it('listarVigenciasService devolve a vigencia da unidade', async () => {
    store.turma_nivel_vigencia = [
      { id: 'v1', tenant_id: TENANT, turma_grupo_id: 'jeftq01', nivel: '4', data_inicio: '2026-01-01', data_fim: null },
      { id: 'v2', tenant_id: 'outra', turma_grupo_id: 'jeftq02', nivel: '9', data_inicio: '2026-01-01', data_fim: null },
    ];
    const vigencias = await listarVigenciasService(TENANT);
    expect(vigencias).toHaveLength(1);
    expect(vigencias[0].turma_grupo_id).toBe('jeftq01');
  });

  it('resolverNivelPorData escolhe o registro mais recente que cobre a data', () => {
    const vigencias = [
      { turma_grupo_id: 'jeftq01', nivel: '4', data_inicio: '2026-01-01', data_fim: '2026-11-30' },
      { turma_grupo_id: 'jeftq01', nivel: '3', data_inicio: '2026-12-01', data_fim: null },
    ];
    expect(resolverNivelPorData(vigencias, 'jeftq01', '2026-06-01')).toBe('4');
    expect(resolverNivelPorData(vigencias, 'jeftq01', '2026-12-01')).toBe('3');
    expect(resolverNivelPorData(vigencias, 'jeftq01', '2025-12-01')).toBeUndefined();
    expect(resolverNivelPorData(vigencias, null, '2026-12-01')).toBeUndefined();
  });
});

describe('propostas de mudanca de nivel', () => {
  it('cria a proposta e vincula o lote', async () => {
    const resultado = await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote1');

    expect(resultado.pendenciaId).toBeTruthy();
    expect(resultado.conflito).toBe(false);
    expect(store.transferencia_nivel_pendencia).toHaveLength(1);
    expect(store.transferencia_nivel_pendencia[0].status).toBe('pendente');
    expect(store.transferencia_nivel_pendencia_lote).toHaveLength(1);
    expect(store.transferencia_nivel_pendencia_lote[0].lote_id).toBe('lote1');
  });

  it('reutiliza a proposta quando a turma, data e nivel sao iguais', async () => {
    const primeira = await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote1');
    const segunda = await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote2');

    expect(segunda.pendenciaId).toBe(primeira.pendenciaId);
    expect(store.transferencia_nivel_pendencia).toHaveLength(1);
    expect(store.transferencia_nivel_pendencia_lote).toHaveLength(2);
  });

  it('marca conflito quando o nivel difere para a mesma turma e data', async () => {
    await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote1');
    const conflito = await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '5', '2026-12-01', 'lote2');

    expect(conflito.conflito).toBe(true);
    expect(conflito.conflitantes.length).toBe(1);
    expect(conflito.conflitantes[0].nivel_novo).toBe('3');
    expect(store.transferencia_nivel_pendencia.find((p) => p.nivel_novo === '5')?.status).toBe('conflito');
  });

  it('exige o novo nivel da turma', async () => {
    await expect(
      criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '  ', '2026-12-01', 'lote1'),
    ).rejects.toThrow(/Informe o novo nivel da turma/);
  });

  it('liberar a dependencia cancela a proposta quando nao restam lotes', async () => {
    await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote1');
    await liberarPropostaDoLoteService(TENANT, 'lote1');

    expect(store.transferencia_nivel_pendencia_lote).toHaveLength(0);
    expect(store.transferencia_nivel_pendencia[0].status).toBe('cancelado');
  });

  it('liberar um lote preserva a proposta quando outro lote ainda depende dela', async () => {
    await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote1');
    await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote2');
    await liberarPropostaDoLoteService(TENANT, 'lote1');

    expect(store.transferencia_nivel_pendencia[0].status).toBe('pendente');
    expect(store.transferencia_nivel_pendencia_lote).toHaveLength(1);
    expect(store.transferencia_nivel_pendencia_lote[0].lote_id).toBe('lote2');
  });

  it('listarPendenciasNivelService traz apenas propostas ativas com os lotes', async () => {
    store.transferencia_lote = [
      { id: 'lote1', tenant_id: TENANT, data_efetiva: '2026-12-01', turma_destino: 'jeftq01', status: 'programado' },
    ];
    await criarOuReusarPropostaNivelService(TENANT, 'jeftq01', '4', '3', '2026-12-01', 'lote1');

    const pendencias = await listarPendenciasNivelService(TENANT);
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].nivel_novo).toBe('3');
    expect(pendencias[0].lotes?.[0]?.id).toBe('lote1');
  });
});
