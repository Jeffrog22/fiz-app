jest.mock('../supabaseClient', () => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = {
    transferencia_lote: [],
    transferencia_lote_item: [],
    alunos: [],
    turmas: [],
    enrollment_period: [],
    professores: [],
  };

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
      select() { if (state.op === 'delete') state.returning = true; return b; },
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
            (r) => r.tenant_id === payload.tenant_id && r.key === payload.key,
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

  return {
    supabase: {
      from,
      __store: store,
      rpc: (fn: string, params: any) => {
        if (fn === 'aplicar_transferencia_lote') {
          const { p_lote_id, p_confirmado_por } = params;
          const lote = store.transferencia_lote.find((l) => l.id === p_lote_id);
          if (!lote || !['programado', 'revisao'].includes(lote.status)) {
            return Promise.reject(new Error('Lote nao esta disponível para aplicacao (ja aplicado, cancelado ou em processo)'));
          }
          // Marca como aplicando (protege contra concorrência)
          lote.status = 'aplicando';
          const resultados: any[] = [];
          for (const item of store.transferencia_lote_item.filter((i) => i.lote_id === p_lote_id && i.status === 'pendente')) {
            // Revalida origem
            const periodoAtivo = store.enrollment_period.find(
              (e) => e.aluno_id === item.aluno_id && e.tenant_id === lote.tenant_id && e.data_fim === null,
            );
            if (!periodoAtivo || periodoAtivo.turma_id !== item.turma_origem) {
              item.status = 'conflito';
              item.erro_mensagem = 'Origem alterada desde a programacao';
              resultados.push({ item_id: item.id, aluno_id: item.aluno_id, status: 'conflito', erro_mensagem: 'Origem alterada desde a programacao' });
              continue;
            }
            // Valida lotação
            const capacidade = (store.turmas.find((t) => t.grupo_id === item.turma_destino && t.tenant_id === lote.tenant_id) || {}).capacidade || 0;
            const ocupacaoAtual = store.alunos.filter((a) => a.turma_id === item.turma_destino && a.tenant_id === lote.tenant_id && a.ativo).length;
            const saidasDestino = store.transferencia_lote_item.filter(
              (i) => i.lote_id === p_lote_id && i.turma_origem === item.turma_destino && i.status === 'aplicado' && i.id !== item.id,
            ).length;
            const entradasDestino = store.transferencia_lote_item.filter(
              (i) => i.lote_id === p_lote_id && i.turma_destino === item.turma_destino && i.status === 'aplicado' && i.id !== item.id,
            ).length + 1;
            const projetado = ocupacaoAtual - saidasDestino + entradasDestino;
            if (capacidade > 0 && projetado > capacidade) {
              item.status = 'erro';
              item.erro_mensagem = `Lotacao excedida na turma destino (${projetado}/${capacidade})`;
              resultados.push({ item_id: item.id, aluno_id: item.aluno_id, status: 'erro', erro_mensagem: 'Lotacao excedida na turma destino' });
              continue;
            }

            // Aplica
            const aluno = store.alunos.find((a) => a.id === item.aluno_id);
            if (aluno) {
              aluno.turma_id = item.turma_destino;
              aluno.nivel = item.nivel_destino || null;
            }
            const pp = store.enrollment_period.find(
              (e) => e.aluno_id === item.aluno_id && e.tenant_id === lote.tenant_id && e.data_fim === null,
            );
            if (pp) pp.data_fim = '2026-09-30';
            store.enrollment_period.push({
              id: 'ep-' + item.aluno_id,
              tenant_id: lote.tenant_id,
              aluno_id: item.aluno_id,
              turma_id: item.turma_destino,
              nivel: item.nivel_destino || null,
              motivo: 'transferencia',
              data_inicio: lote.data_efetiva,
              data_fim: null,
              criado_em: new Date().toISOString(),
            });
            item.status = 'aplicado';
            item.erro_mensagem = null;
            resultados.push({ item_id: item.id, aluno_id: item.aluno_id, status: 'aplicado', erro_mensagem: null });
          }
          lote.status = resultados.every((r) => r.status === 'aplicado') ? 'aplicado' : 'erro_parcial';
          lote.confirmado_em = new Date().toISOString();
          lote.confirmado_por = p_confirmado_por;
          return Promise.resolve({ data: resultados, error: null });
        }
        return Promise.reject(new Error('RPC desconhecido: ' + fn));
      },
    },
  };
});

import {
  criarLote,
  listarLotes,
  buscarLote,
  atualizarLote,
  removerItemLote,
  cancelarLote,
  aplicarLote,
  contarPendentes,
} from '../transferenciaLoteService';
import { supabase } from '../supabaseClient';

const store = (supabase as any).__store as Record<string, any[]>;

const TENANT = 't1';
const PROFESSOR = 'prof1';
const PROFESSOR_DESTINO = 'prof2';

const TURMAS = [
  { id: 'u1', tenant_id: TENANT, grupo_id: 'jeftq01', label: 'Ter/Qui', horario: '07:00', professor_id: PROFESSOR, nivel: 'Iniciação', capacidade: 10 },
  { id: 'u2', tenant_id: TENANT, grupo_id: 'jeftq02', label: 'Ter/Qui', horario: '08:00', professor_id: PROFESSOR, nivel: 'Avançado', capacidade: 10 },
  { id: 'u3', tenant_id: TENANT, grupo_id: 'marqq01', label: 'Ter/Qui', horario: '09:00', professor_id: PROFESSOR_DESTINO, nivel: 'Iniciação', capacidade: 5 },
];

const ALUNOS = [
  { id: 'a1', tenant_id: TENANT, nome: 'Aluno 1', turma_id: 'jeftq01', nivel: 'Iniciação', ativo: true },
  { id: 'a2', tenant_id: TENANT, nome: 'Aluno 2', turma_id: 'jeftq01', nivel: 'Iniciação', ativo: true },
  { id: 'a3', tenant_id: TENANT, nome: 'Aluno 3', turma_id: 'jeftq02', nivel: 'Avançado', ativo: true },
  { id: 'a4', tenant_id: TENANT, nome: 'Aluno 4', turma_id: 'marqq01', nivel: 'Iniciação', ativo: true },
];

beforeEach(() => {
  jest.useRealTimers();
  store.transferencia_lote = [];
  store.transferencia_lote_item = [];
  store.alunos = [...ALUNOS.map((a) => ({ ...a }))];
  store.turmas = [...TURMAS.map((t) => ({ ...t }))];
  store.enrollment_period = [
    { id: 'ep1', tenant_id: TENANT, aluno_id: 'a1', turma_id: 'jeftq01', nivel: 'Iniciação', motivo: 'matricula_inicial', data_inicio: '2026-09-01', data_fim: null, criado_em: '2026-09-01T00:00:00Z' },
    { id: 'ep2', tenant_id: TENANT, aluno_id: 'a2', turma_id: 'jeftq01', nivel: 'Iniciação', motivo: 'matricula_inicial', data_inicio: '2026-09-01', data_fim: null, criado_em: '2026-09-01T00:00:00Z' },
    { id: 'ep3', tenant_id: TENANT, aluno_id: 'a3', turma_id: 'jeftq02', nivel: 'Avançado', motivo: 'matricula_inicial', data_inicio: '2026-09-01', data_fim: null, criado_em: '2026-09-01T00:00:00Z' },
    { id: 'ep4', tenant_id: TENANT, aluno_id: 'a4', turma_id: 'marqq01', nivel: 'Iniciação', motivo: 'matricula_inicial', data_inicio: '2026-09-01', data_fim: null, criado_em: '2026-09-01T00:00:00Z' },
  ];
  store.professores = [];
});

afterEach(() => {
  jest.useRealTimers();
});

/** Avanca o relogio (a aplicacao so e liberada a partir da data efetiva) */
const avancarClock = (iso: string) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${iso}T12:00:00`));
};

describe('transferenciaLoteService', () => {
  it('cria lote com alunos de duas origens diferentes para mesmo destino', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      nivel_destino: 'Iniciação',
      professor_destino: PROFESSOR_DESTINO,
      data_efetiva: '2027-01-01',
      itens: [
        { aluno_id: 'a1', turma_destino: 'marqq01' },
        { aluno_id: 'a3', turma_destino: 'marqq01' },
      ],
    });

    expect(lote.turma_destino).toBe('marqq01');
    expect(lote.status).toBe('programado');
    expect(lote.data_efetiva).toBe('2027-01-01');
    expect(store.transferencia_lote_item.filter((i) => i.lote_id === lote.id && i.status === 'pendente')).toHaveLength(2);
    // Verifica origem capturada da matrícula atual
    const itens = store.transferencia_lote_item.filter((i) => i.lote_id === lote.id);
    expect(itens.find((i) => i.aluno_id === 'a1')?.turma_origem).toBe('jeftq01');
    expect(itens.find((i) => i.aluno_id === 'a3')?.turma_origem).toBe('jeftq02');
  });

  it('rejeita aluno que ja tem lote ativo para mesma data', async () => {
    const lote1 = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    await expect(
      criarLote(TENANT, PROFESSOR, {
        turma_destino: 'marqq01',
        data_efetiva: '2027-01-01',
        itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
      }),
    ).rejects.toThrow(/ja possuem transferencia programada para esta data/);
  });

  it('rejeita aluno sem matricula vigente (sem turma)', async () => {
    store.alunos.push({ id: 'a5', tenant_id: TENANT, nome: 'Aluno 5', turma_id: null, nivel: null, ativo: true });

    await expect(
      criarLote(TENANT, PROFESSOR, {
        turma_destino: 'marqq01',
        data_efetiva: '2027-01-01',
        itens: [{ aluno_id: 'a5', turma_destino: 'marqq01' }],
      }),
    ).rejects.toThrow(/sem matricula vigente/);
  });

  it('rejeita aluno com lote ativo em outra data efetiva', async () => {
    await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    await expect(
      criarLote(TENANT, PROFESSOR, {
        turma_destino: 'jeftq02',
        data_efetiva: '2027-02-01',
        itens: [{ aluno_id: 'a1', turma_destino: 'jeftq02' }],
      }),
    ).rejects.toThrow(/ja possuem transferencia programada em outro lote/);
  });

  it('rejeita data efetiva no passado', async () => {
    await expect(
      criarLote(TENANT, PROFESSOR, {
        turma_destino: 'marqq01',
        data_efetiva: '2026-01-01',
        itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
      }),
    ).rejects.toThrow(/nao pode ser no passado/);
  });

  it('rejeita turma destino invalida', async () => {
    await expect(
      criarLote(TENANT, PROFESSOR, {
        turma_destino: 'inexistente',
        data_efetiva: '2027-01-01',
        itens: [{ aluno_id: 'a1', turma_destino: 'inexistente' }],
      }),
    ).rejects.toThrow(/nao encontrada nesta unidade/);
  });

  it('lista lotes criados', async () => {
    await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    const lotes = await listarLotes(TENANT);
    expect(lotes.length).toBe(1);
    expect(lotes[0].totalItens).toBe(1);
    expect(lotes[0].itensPendentes).toBe(1);
  });

  it('busca lote com itens', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    const resultado = await buscarLote(lote.id, TENANT);
    expect(resultado).not.toBeNull();
    expect(resultado!.lote.id).toBe(lote.id);
    expect(resultado!.itens).toHaveLength(1);
    expect(resultado!.itens[0].aluno_nome).toBe('Aluno 1');
  });

  it('atualiza lote pendente mudando destino e recalcula itens', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    const atualizado = await atualizarLote(lote.id, TENANT, PROFESSOR, {
      turma_destino: 'jeftq02',
    });

    expect(atualizado.turma_destino).toBe('jeftq02');
    const itens = store.transferencia_lote_item.filter((i) => i.lote_id === lote.id && i.status === 'pendente');
    expect(itens[0].turma_destino).toBe('jeftq02');
  });

  it('nao permite atualizar lote ja aplicado', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });
    // Simula aplicação direta no store para testar a regra
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    loteStore.status = 'aplicado';

    await expect(
      atualizarLote(lote.id, TENANT, PROFESSOR, { turma_destino: 'jeftq02' }),
    ).rejects.toThrow(/Só é possível editar lotes programados ou em revisao/);
  });

  it('remove item pendente do lote', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [
        { aluno_id: 'a1', turma_destino: 'marqq01' },
        { aluno_id: 'a2', turma_destino: 'marqq01' },
      ],
    });

    await removerItemLote(lote.id, 'a2', TENANT);
    const itens = store.transferencia_lote_item.filter((i) => i.lote_id === lote.id);
    expect(itens).toHaveLength(1);
    expect(itens[0].aluno_id).toBe('a1');
  });

  it('cancela lote automaticamente ao retirar o ultimo item pendente', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    const resultado = await removerItemLote(lote.id, 'a1', TENANT);

    // Item removido
    const itens = store.transferencia_lote_item.filter((i) => i.lote_id === lote.id);
    expect(itens).toHaveLength(0);
    // Lote cancelado porque ficou vazio
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).toBe('cancelado');
    // Retorno reflete o cancelamento automatico (o front usa isso, nao o estado local)
    expect(resultado).toEqual({
      status: 'cancelado',
      itensRestantes: 0,
      canceladoAutomaticamente: true,
    });
  });

  it('nao cancela lote se ainda restar pelo menos um item pendente', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [
        { aluno_id: 'a1', turma_destino: 'marqq01' },
        { aluno_id: 'a2', turma_destino: 'marqq01' },
      ],
    });

    const resultado = await removerItemLote(lote.id, 'a2', TENANT);

    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).toBe('programado');
    expect(store.transferencia_lote_item.filter((i) => i.lote_id === lote.id && i.status === 'pendente')).toHaveLength(1);
    // Retorno indica que o lote continua ativo
    expect(resultado).toEqual({
      status: 'programado',
      itensRestantes: 1,
      canceladoAutomaticamente: false,
    });
  });

  it('rejeita remocao quando lote ja nao esta ativo (aplicado)', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });
    // Simula aplicacao concorrente
    store.transferencia_lote.find((l) => l.id === lote.id)!.status = 'aplicado';

    await expect(removerItemLote(lote.id, 'a1', TENANT)).rejects.toThrow(/nao esta disponível para modificacao/);
    // Item nao foi removido
    expect(store.transferencia_lote_item.filter((i) => i.lote_id === lote.id)).toHaveLength(1);
  });

  it('rejeita remocao de lote inexistente', async () => {
    await expect(removerItemLote('id-inexistente', 'a1', TENANT)).rejects.toThrow(/Lote nao encontrado/);
  });

  it('rejeita remocao de lote de outra unidade (tenant)', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    await expect(removerItemLote(lote.id, 'a1', 'outra-unidade')).rejects.toThrow(/Lote nao encontrado/);
  });

  it('nao cancela lote se aplicacao concorrente o esvaziar entre a leitura e o cancelamento', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    // A aplicacao marca como aplicando e depois aplicado (mesmo comportamento do serviço de aplicacao)
    store.transferencia_lote.find((l) => l.id === lote.id)!.status = 'aplicando';

    // Mesmo estando em 'aplicando' (nao esta em STATUS_ATIVOS), a remocao e rejeitada
    await expect(removerItemLote(lote.id, 'a1', TENANT)).rejects.toThrow(/nao esta disponível para modificacao/);
  });

  it('cancela lote pendente', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    await cancelarLote(lote.id, TENANT, PROFESSOR);
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).toBe('cancelado');
  });

  it('aplica lote com sucesso: move alunos, fecha e abre períodos', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      nivel_destino: 'Iniciação',
      professor_destino: PROFESSOR_DESTINO,
      data_efetiva: '2027-01-01',
      itens: [
        { aluno_id: 'a1', turma_destino: 'marqq01' },
        { aluno_id: 'a3', turma_destino: 'marqq01' },
      ],
    });

    avancarClock('2027-01-02');
    const resultado = await aplicarLote(lote.id, TENANT, PROFESSOR);

    expect(resultado.aplicados).toBe(2);
    expect(resultado.erros).toBe(0);
    expect(resultado.conflitos).toBe(0);

    // Alunos movidos
    expect(store.alunos.find((a) => a.id === 'a1')?.turma_id).toBe('marqq01');
    expect(store.alunos.find((a) => a.id === 'a3')?.turma_id).toBe('marqq01');

    // Períodos: antigo fechado em 2026-09-30, novo aberto em 2027-01-01
    const epsA1 = store.enrollment_period.filter((e) => e.aluno_id === 'a1');
    expect(epsA1.find((e) => e.data_fim === null)?.turma_id).toBe('marqq01');
    expect(epsA1.find((e) => e.data_fim === null)?.data_inicio).toBe('2027-01-01');

    // Lote aplicado
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).toBe('aplicado');
    expect(loteStore.confirmado_por).toBe(PROFESSOR);
  });

  it('aplicacao repetida nao duplica (segundo chamado falha)', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    avancarClock('2027-01-02');
    await aplicarLote(lote.id, TENANT, PROFESSOR);

    await expect(aplicarLote(lote.id, TENANT, PROFESSOR)).rejects.toThrow(/ja foi aplicado/);
  });

  it('bloqueia aplicacao antes da data efetiva', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    // Relogio ainda antes da data efetiva
    avancarClock('2026-12-20');

    await expect(aplicarLote(lote.id, TENANT, PROFESSOR)).rejects.toThrow(/data efetiva do lote ainda nao chegou/);

    // Lote permanece pendente (sem movimentação parcial)
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).toBe('programado');
    expect(store.alunos.find((a) => a.id === 'a1')?.turma_id).toBe('jeftq01');
  });

  it('conflito quando origem foi alterada desde a programacao', async () => {
    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }],
    });

    // Altera a origem do aluno (simula transferência anterior)
    store.alunos.find((a) => a.id === 'a1')!.turma_id = 'jeftq02';
    const epAtivo = store.enrollment_period.find((e) => e.aluno_id === 'a1' && e.data_fim === null)!;
    epAtivo.turma_id = 'jeftq02';

    avancarClock('2027-01-02');
    const resultado = await aplicarLote(lote.id, TENANT, PROFESSOR);

    expect(resultado.conflitos).toBe(1);
    expect(resultado.aplicados).toBe(0);
    // Lote não deve ficar aplicado completamente
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).not.toBe('aplicado');
  });

  it('bloqueia por lotação excedida no destino', async () => {
    // marqq01 tem capacidade 5 e já tem aluno 4 (ativo)
    // Vamos encher com mais alunos simulados
    for (let i = 0; i < 4; i++) {
      store.alunos.push({ id: `ext${i}`, tenant_id: TENANT, nome: `Ext ${i}`, turma_id: 'marqq01', nivel: 'Iniciação', ativo: true });
      store.enrollment_period.push({ id: `epe${i}`, tenant_id: TENANT, aluno_id: `ext${i}`, turma_id: 'marqq01', nivel: 'Iniciação', motivo: 'matricula_inicial', data_inicio: '2026-09-01', data_fim: null, criado_em: '2026-09-01T00:00:00Z' });
    }

    const lote = await criarLote(TENANT, PROFESSOR, {
      turma_destino: 'marqq01',
      data_efetiva: '2027-01-01',
      itens: [
        { aluno_id: 'a1', turma_destino: 'marqq01' },
        { aluno_id: 'a2', turma_destino: 'marqq01' },
      ],
    });

    avancarClock('2027-01-02');
    const resultado = await aplicarLote(lote.id, TENANT, PROFESSOR);

    // 5 já ocupados + 2 entradas = 7 > capacidade 5 -> erro
    expect(resultado.erros).toBeGreaterThan(0);
    const loteStore = store.transferencia_lote.find((l) => l.id === lote.id)!;
    expect(loteStore.status).not.toBe('aplicado');
  });

  it('contarPendentes retorna lotes programados', async () => {
    expect(await contarPendentes(TENANT)).toBe(0);
    await criarLote(TENANT, PROFESSOR, { turma_destino: 'marqq01', data_efetiva: '2027-01-01', itens: [{ aluno_id: 'a1', turma_destino: 'marqq01' }] });
    await criarLote(TENANT, PROFESSOR, { turma_destino: 'marqq01', data_efetiva: '2027-01-01', itens: [{ aluno_id: 'a2', turma_destino: 'marqq01' }] });
    expect(await contarPendentes(TENANT)).toBe(2);
  });
});
