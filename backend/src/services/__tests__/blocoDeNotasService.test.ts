jest.mock('../supabaseClient', () => {
  let store: any[] = [];

  function from(_table: string) {
    const state: any = {
      op: 'select',
      filters: [] as { col: string; val: any }[],
      payload: null,
      single: false,
      order: [] as { col: string; ascending: boolean }[],
    };
    const b: any = {
      select() { return b; },
      eq(col: string, val: any) { state.filters.push({ col, val }); return b; },
      order(col: string, opts?: any) {
        state.order.push({ col, ascending: opts?.ascending ?? true });
        return b;
      },
      insert(payload: any) { state.op = 'insert'; state.payload = payload; return b; },
      update(payload: any) { state.op = 'update'; state.payload = payload; return b; },
      delete() { state.op = 'delete'; return b; },
      single() { state.single = true; return b; },
      then(resolve: any) {
        return Promise.resolve(exec()).then(resolve);
      },
    };

    function exec(): { data: any; error: null } {
      const aplicarFiltros = (rows: any[]) => {
        return rows.filter((r: any) =>
          state.filters.every((f: { col: string; val: any }) => r[f.col] === f.val),
        );
      };

      if (state.op === 'insert') {
        const nova = { id: state.payload.id || 'nova-id', ...state.payload, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
        store.push(nova);
        return { data: state.single ? nova : [nova], error: null };
      }
      if (state.op === 'update') {
        const idx = store.findIndex((r: any) =>
          state.filters.every((f: { col: string; val: any }) => r[f.col] === f.val),
        );
        if (idx === -1) return { data: null, error: null };
        const atualizada = { ...store[idx], ...state.payload, atualizado_em: new Date().toISOString() };
        store[idx] = atualizada;
        return { data: state.single ? atualizada : [atualizada], error: null };
      }
      if (state.op === 'delete') {
        const removidos = store.filter((r: any) =>
          state.filters.every((f: { col: string; val: any }) => r[f.col] === f.val),
        );
        store = store.filter((r: any) =>
          !state.filters.every((f: { col: string; val: any }) => r[f.col] === f.val),
        );
        return { data: removidos, error: null };
      }

      let resultado = aplicarFiltros([...store]);
      state.order.forEach((o: { col: string; ascending: boolean }) => {
        resultado.sort((a: any, b: any) => {
          const va = a[o.col]; const vb = b[o.col];
          if (va < vb) return o.ascending ? -1 : 1;
          if (va > vb) return o.ascending ? 1 : -1;
          return 0;
        });
      });
      return { data: state.single ? (resultado[0] || null) : resultado, error: null };
    }

    return b;
  }

  return { supabase: { from, __store: () => store } };
});

import * as blocoDeNotasService from '../blocoDeNotasService';
const { supabase } = require('../supabaseClient');
const store = (supabase as any).__store();

const tenantId = 'bela-vista';
const professorA = 'jeff';
const professorB = 'duda';

function notaBase(overrides: any = {}) {
  return {
    id: overrides.id || 'id-1',
    tenant_id: overrides.tenant_id ?? tenantId,
    professor_id: overrides.professor_id ?? professorA,
    titulo: overrides.titulo ?? 'Nota de teste',
    conteudo: overrides.conteudo ?? '',
    tipo: overrides.tipo ?? 'texto',
    itens: overrides.itens ?? [],
    cor: overrides.cor ?? 'amarelo',
    fixada: overrides.fixada ?? false,
    criado_em: overrides.criado_em ?? new Date().toISOString(),
    atualizado_em: overrides.atualizado_em ?? new Date().toISOString(),
  };
}

beforeEach(() => {
  store.length = 0;
  jest.clearAllMocks();
});

describe('blocoDeNotasService - isolamento por professor e unidade', () => {
  test('listar so retorna notas do professor autenticado na unidade', async () => {
    store.push(notaBase({ id: 'a', professor_id: professorA, titulo: 'Nota A' }));
    store.push(notaBase({ id: 'b', professor_id: professorB, titulo: 'Nota B' }));

    const notasA = await blocoDeNotasService.listarNotas(tenantId, professorA);
    expect(notasA.map((n) => n.id)).toEqual(['a']);

    const notasB = await blocoDeNotasService.listarNotas(tenantId, professorB);
    expect(notasB.map((n) => n.id)).toEqual(['b']);
  });

  test('nao vazia notas de outra unidade (tenant)', async () => {
    store.push(notaBase({ id: 'a', tenant_id: tenantId, professor_id: professorA, titulo: 'Nota A' }));
    store.push(notaBase({ id: 'b', tenant_id: 'outra-unidade', professor_id: professorA, titulo: 'Nota B' }));

    const notas = await blocoDeNotasService.listarNotas(tenantId, professorA);
    expect(notas.map((n) => n.id)).toEqual(['a']);
  });

  test('criar grava tenant_id e professor_id informados', async () => {
    const salva = await blocoDeNotasService.criarNota(tenantId, professorA, {
      titulo: 'Nova nota',
      tipo: 'lista',
      itens: [{ id: 'i1', texto: 'Fazer X', concluido: false }],
      cor: 'verde',
    });
    expect(salva.tenant_id).toBe(tenantId);
    expect(salva.professor_id).toBe(professorA);
    expect(salva.titulo).toBe('Nova nota');
    expect(salva.tipo).toBe('lista');
    expect(salva.cor).toBe('verde');
    expect(salva.itens[0].concluido).toBe(false);
  });

  test('atualizar so afeta nota do mesmo professor e tenant', async () => {
    store.push(notaBase({ id: 'a', professor_id: professorA, titulo: 'Antigo' }));
    store.push(notaBase({ id: 'b', professor_id: professorB, titulo: 'Outro' }));

    const atualizada = await blocoDeNotasService.atualizarNota('a', tenantId, professorA, {
      titulo: 'Novo titulo',
    });
    expect(atualizada.titulo).toBe('Novo titulo');

    const naoTocada = await blocoDeNotasService.listarNotas(tenantId, professorB);
    expect(naoTocada.find((n) => n.id === 'b')?.titulo).toBe('Outro');
  });

  test('atualizar lista preserva concluido dos itens que continuam', async () => {
    store.push(notaBase({
      id: 'a',
      tipo: 'lista',
      itens: [
        { id: 'i1', texto: 'Tarefa 1', concluido: true },
        { id: 'i2', texto: 'Tarefa 2', concluido: false },
      ],
    }));

    const atualizada = await blocoDeNotasService.atualizarNota('a', tenantId, professorA, {
      itens: [
        { id: 'i1', texto: 'Tarefa 1', concluido: true },
        { id: 'i3', texto: 'Tarefa nova', concluido: false },
      ],
    });
    const i1 = atualizada.itens.find((i) => i.id === 'i1');
    const i3 = atualizada.itens.find((i) => i.id === 'i3');
    expect(i1?.concluido).toBe(true);
    expect(i3?.texto).toBe('Tarefa nova');
  });

  test('fixar e desafixar movem a nota entre secoes', async () => {
    store.push(notaBase({ id: 'a', fixada: false }));

    const fixada = await blocoDeNotasService.fixarNota('a', tenantId, professorA, true);
    expect(fixada.fixada).toBe(true);

    const desafixada = await blocoDeNotasService.fixarNota('a', tenantId, professorA, false);
    expect(desafixada.fixada).toBe(false);
  });

  test('remover so remove nota do mesmo professor e tenant', async () => {
    store.push(notaBase({ id: 'a', professor_id: professorA, titulo: 'A' }));
    store.push(notaBase({ id: 'b', professor_id: professorB, titulo: 'B' }));

    await blocoDeNotasService.removerNota('a', tenantId, professorA);

    const restantesA = await blocoDeNotasService.listarNotas(tenantId, professorA);
    expect(restantesA.length).toBe(0);
    const restantesB = await blocoDeNotasService.listarNotas(tenantId, professorB);
    expect(restantesB.map((n) => n.id)).toEqual(['b']);
  });

  test('atualizar nota de outro professor retorna nao encontrada', async () => {
    store.push(notaBase({ id: 'a', professor_id: professorB }));
    await expect(
      blocoDeNotasService.atualizarNota('a', tenantId, professorA, { titulo: 'X' }),
    ).rejects.toThrow(/nao encontrada/);
  });
});
