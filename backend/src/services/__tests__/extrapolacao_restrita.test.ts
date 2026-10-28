jest.mock('../supabaseClient', () => {
  type Row = Record<string, any>;
  const store: Record<string, Row[]> = {
    turmas: [],
    chamadas_log: [],
    card_aula: [],
    app_settings: [],
    alunos: [],
  };
  const failTables = new Set<string>();

  const match = (row: Row, f: any): boolean => {
    if (f.type === 'eq') return row[f.col] === f.val;
    if (f.type === 'in') return Array.isArray(f.vals) && f.vals.includes(row[f.col]);
    if (f.type === 'is') {
      const valor = row[f.col];
      return f.val === null ? valor === null || valor === undefined : valor === f.val;
    }
    if (f.type === 'not' && f.op === 'is' && f.val === null) {
      const valor = row[f.col];
      return !(valor === null || valor === undefined);
    }
    return true;
  };

  function from(table: string) {
    const state: any = { op: 'select', filters: [], maybe: false, returning: false, payload: null };
    const b: any = {
      select(_cols?: string) {
        if (state.op === 'delete' || state.op === 'upsert') state.returning = true;
        return b;
      },
      eq(col: string, val: any) { state.filters.push({ type: 'eq', col, val }); return b; },
      in(col: string, vals: any[]) { state.filters.push({ type: 'in', col, vals }); return b; },
      is(col: string, val: any) { state.filters.push({ type: 'is', col, val }); return b; },
      not(col: string, op: string, val: any) { state.filters.push({ type: 'not', col, op, val }); return b; },
      order() { return b; },
      maybeSingle() { state.maybe = true; return b; },
      single() { state.maybe = true; return b; },
      delete() { state.op = 'delete'; return b; },
      upsert(payload: any, _opts?: any) { state.op = 'upsert'; state.payload = payload; return b; },
      insert(payload: any) { state.op = 'insert'; state.payload = payload; return b; },
      then(resolve: any, reject: any) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };

    function execute(): { data: any; error: { message: string } | null } {
      if (failTables.has(table)) return { data: null, error: { message: `column "${table}" does not exist` } };
      const rows = store[table] || (store[table] = []);

      if (state.op === 'select') {
        const filtradas = rows.filter((r) => state.filters.every((f: any) => match(r, f)));
        return { data: state.maybe ? (filtradas[0] ?? null) : filtradas, error: null };
      }
      if (state.op === 'delete') {
        const filtradas = rows.filter((r) => state.filters.every((f: any) => match(r, f)));
        store[table] = rows.filter((r) => !state.filters.every((f: any) => match(r, f)));
        return { data: state.returning ? filtradas : null, error: null };
      }
      if (state.op === 'upsert') {
        const payload: Row[] = Array.isArray(state.payload) ? state.payload : [state.payload];
        let ultimo: Row | null = null;
        for (const novo of payload) {
          const idx = rows.findIndex((r) => {
            if (table === 'app_settings') return r.key === novo.key;
            return r.tenant_id === novo.tenant_id && r.data === novo.data
              && r.grupo_id === novo.grupo_id && r.indice_aula === novo.indice_aula;
          });
          if (idx >= 0) rows[idx] = { ...rows[idx], ...novo };
          else rows.push({ ...novo });
          ultimo = idx >= 0 ? rows[idx] : rows[rows.length - 1];
        }
        return { data: state.returning ? ultimo : null, error: null };
      }
      if (state.op === 'insert') {
        const payload: Row[] = Array.isArray(state.payload) ? state.payload : [state.payload];
        for (const novo of payload) rows.push({ ...novo });
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    return b;
  }

  return {
    supabase: {
      from,
      __store: store,
      __fail: (t: string) => failTables.add(t),
      __unfail: (t: string) => failTables.delete(t),
    },
  };
});

jest.mock('../../utils/logEngine', () => ({ registrarOperacao: jest.fn() }));

import {
  limparExtrapolacaoNormal,
  salvarCardBO,
  cancelarBO,
} from '../chamadasService';
import { isExtrapolacaoRestrita } from '../appSettingsService';
import {
  extrapolarCancelamento,
  extrapolarCancelamentoGeral,
} from '../extrapolarService';
import { obterCardAula } from '../cardAulaService';
import { AppSettingsController } from '../../controllers/appSettingsController';
import { AppError } from '../../middleware/errorHandler';
import { supabase } from '../supabaseClient';

const mockSupabase = supabase as any;
const store = mockSupabase.__store as Record<string, any[]>;

const DATA = '2026-09-22';
const T1 = 't1';

const turmasBase = () => [
  { tenant_id: T1, grupo_id: 'jeff01', label: 'Ter/Qui', professor_id: 'jeff', horario: '07:00', faixa_etaria: '+ 16 anos', nivel: 'AVANÇADO' },
  { tenant_id: T1, grupo_id: 'jeff02', label: 'Ter/Qui', professor_id: 'jeff', horario: '08:00', faixa_etaria: '+ 16 anos', nivel: 'AVANÇADO' },
  { tenant_id: T1, grupo_id: 'duda01', label: 'Ter/Qui', professor_id: 'duda', horario: '18:00', faixa_etaria: '+ 16 anos', nivel: 'AVANÇADO' },
  { tenant_id: T1, grupo_id: 'duda02', label: 'Ter/Qui', professor_id: 'duda', horario: '19:00', faixa_etaria: '+ 16 anos', nivel: 'AVANÇADO' },
];

const logRow = (p: Partial<any>) => ({
  tenant_id: T1,
  data: DATA,
  tipo_ocorrencia: null,
  tipo_select: null,
  origem: 'extrapolado',
  status: 'cancelado',
  ...p,
});

const setToggle = (valor: Record<string, boolean>) => {
  store.app_settings = [{ key: 'extrapolacao_restrita', value: valor, atualizado_em: new Date().toISOString() }];
};

beforeEach(() => {
  store.turmas = [];
  store.chamadas_log = [];
  store.card_aula = [];
  store.app_settings = [];
  store.alunos = [];
  mockSupabase.__unfail('app_settings');
  mockSupabase.__unfail('card_aula');
});

describe('isExtrapolacaoRestrita (toggle por unidade em app_settings)', () => {
  it('retorna false quando a chave não existe (fail-open = comportamento atual)', async () => {
    expect(await isExtrapolacaoRestrita('parque')).toBe(false);
  });

  it('retorna true apenas para a unidade configurada no objeto value', async () => {
    setToggle({ parque: true, 'bela-vista': false });
    expect(await isExtrapolacaoRestrita('parque')).toBe(true);
    expect(await isExtrapolacaoRestrita('bela-vista')).toBe(false);
    expect(await isExtrapolacaoRestrita('sao-matheus')).toBe(false);
  });

  it('fail-open: erro de leitura mantém false (extrapolação ampla preservada)', async () => {
    setToggle({ parque: true });
    mockSupabase.__fail('app_settings');
    expect(await isExtrapolacaoRestrita('parque')).toBe(false);
    mockSupabase.__unfail('app_settings');
  });
});

describe('extrapolarService com professorIdFilter (CardAula/clima)', () => {
  beforeEach(() => {
    store.turmas = turmasBase();
    store.chamadas_log = [];
  });

  it('extrapolarCancelamentoGeral cria logs só das turmas do professor filtrado', async () => {
    const result = await extrapolarCancelamentoGeral(
      T1, DATA, 'jeff01', 0, true, 'Raios e Trovões', 'Raios e Trovões', 'geral', 'jeff',
    );
    expect(result.count).toBe(2); // jeff01@idx0 + jeff02@idx1

    const grupos = new Set(store.chamadas_log.map((l) => l.grupo_id));
    expect(grupos).toEqual(new Set(['jeff01', 'jeff02']));
    expect(store.chamadas_log.every((l) => l.status === 'cancelado')).toBe(true);
  });

  it('sem filtro mantém o comportamento antigo: todos os professores do label', async () => {
    const result = await extrapolarCancelamentoGeral(
      T1, DATA, 'jeff01', 0, true, 'Raios e Trovões', 'Raios e Trovões', 'geral',
    );
    expect(result.count).toBe(4);
    const grupos = new Set(store.chamadas_log.map((l) => l.grupo_id));
    expect(grupos).toEqual(new Set(['jeff01', 'jeff02', 'duda01', 'duda02']));
  });

  it('extrapolarCancelamento (clima do CardAula) com filtro não vaza para outro professor', async () => {
    const result = await extrapolarCancelamento(
      T1, DATA, 'jeff01', 0, 12, 'Água crítica', undefined, undefined,
      20, undefined, undefined, undefined, 'jeff',
    );
    expect(result.count).toBe(2);

    const grupos = new Set(store.chamadas_log.map((l) => l.grupo_id));
    expect(grupos).toEqual(new Set(['jeff01', 'jeff02']));
    expect(store.chamadas_log[0].motivo).toBe('Água crítica');
    expect(store.chamadas_log.find((l) => l.grupo_id.startsWith('duda'))).toBeUndefined();
  });
});

describe('limparExtrapolacaoNormal com professorIdFilter (AULA_NORMAL)', () => {
  beforeEach(() => {
    store.turmas = turmasBase();
    store.chamadas_log = [
      logRow({ grupo_id: 'jeff01', indice_aula: 0 }),
      logRow({ grupo_id: 'jeff02', indice_aula: 1 }),
      logRow({ grupo_id: 'duda01', indice_aula: 0 }),
      logRow({ grupo_id: 'duda02', indice_aula: 1 }),
    ];
    store.card_aula = [];
  });

  it('com filtro, limpa só os logs do próprio professor', async () => {
    const removidos = await limparExtrapolacaoNormal(T1, DATA, 'jeff01', 0, 'jeff');
    expect(removidos).toBe(2);

    const restantes = store.chamadas_log.map((l) => l.grupo_id).sort();
    expect(restantes).toEqual(['duda01', 'duda02']);
  });

  it('sem filtro continua limpando o label inteiro (toggle desligado)', async () => {
    const removidos = await limparExtrapolacaoNormal(T1, DATA, 'jeff01', 0);
    expect(removidos).toBe(4);
    expect(store.chamadas_log.length).toBe(0);
  });

  it('card climático de outro professor não governa a limpeza do professor filtrado', async () => {
    // Índice 0 tem card AULA_CANCELADA do duda (outro professor/piscina) — sem o
    // filtro nos cards, ele protegeria o idx 0 e o log do jeff NÃO seria limpo.
    store.card_aula = [
      { tenant_id: T1, data: DATA, indice_aula: 0, status_sugerido: 'AULA_CANCELADA', professor_id: 'duda' },
    ];

    const removidos = await limparExtrapolacaoNormal(T1, DATA, 'jeff01', 0, 'jeff');
    expect(removidos).toBe(2); // idx 0 e 1 do jeff — card do duda é ignorado

    expect(store.chamadas_log.find((l) => l.grupo_id === 'duda01')).toBeDefined();
    expect(store.chamadas_log.find((l) => l.grupo_id === 'jeff01')).toBeUndefined();
  });

  it('card climático do próprio professor continua protegendo (governante filtrado)', async () => {
    store.card_aula = [
      { tenant_id: T1, data: DATA, indice_aula: 1, status_sugerido: 'FALTA_JUSTIFICADA', professor_id: 'jeff' },
    ];

    const removidos = await limparExtrapolacaoNormal(T1, DATA, 'jeff01', 0, 'jeff');
    expect(removidos).toBe(1); // idx 0 limpo (sem card); idx 1 protegido pelo card do jeff

    expect(store.chamadas_log.find((l) => l.grupo_id === 'jeff01')).toBeUndefined();
    expect(store.chamadas_log.find((l) => l.grupo_id === 'jeff02')).toBeDefined();
  });
});

describe('salvarCardBO via_1 respeita o toggle', () => {
  beforeEach(() => {
    store.turmas = turmasBase();
    store.chamadas_log = [];
  });

  it('toggle ON: cancela só as turmas do professor que registrou o BO', async () => {
    setToggle({ [T1]: true });

    await salvarCardBO(T1, DATA, 0, 'via_1', 'Raios e Trovões', 'trovoadas', true, 'jeff', 'jeff01');

    const grupos = new Set(store.chamadas_log.map((l) => l.grupo_id));
    expect(grupos).toEqual(new Set(['jeff01', 'jeff02']));
    expect(store.chamadas_log.every((l) => l.tipo_select === 'geral')).toBe(true);
  });

  it('toggle OFF: cancela o label inteiro (comportamento antigo)', async () => {
    setToggle({ [T1]: false });

    await salvarCardBO(T1, DATA, 0, 'via_1', 'Raios e Trovões', 'trovoadas', true, 'jeff', 'jeff01');

    const grupos = new Set(store.chamadas_log.map((l) => l.grupo_id));
    expect(grupos).toEqual(new Set(['jeff01', 'jeff02', 'duda01', 'duda02']));
  });

  it('via_2 (Pessoal) segue inalterado: só o próprio professor, com ou sem toggle', async () => {
    setToggle({ [T1]: true });

    await salvarCardBO(T1, DATA, 0, 'via_2', 'Médico pessoal', 'consulta', true, 'jeff', 'jeff01');

    const grupos = new Set(store.chamadas_log.map((l) => l.grupo_id));
    expect(grupos).toEqual(new Set(['jeff01', 'jeff02']));
    expect(store.chamadas_log.every((l) => l.tipo_select === 'pessoal')).toBe(true);
  });
});

describe('cancelarBO (Limpar BO) respeita o toggle no ramo via_1', () => {
  const seedLogs = () => {
    store.turmas = turmasBase();
    store.chamadas_log = [
      // fonte do BO (linha que o Limpar remove primeiro)
      logRow({ grupo_id: 'jeff01', indice_aula: 0, tipo_ocorrencia: 'Raios e Trovões', tipo_select: 'geral' }),
      // extrapolados do mesmo BO
      logRow({ grupo_id: 'jeff02', indice_aula: 1, tipo_ocorrencia: 'Raios e Trovões', tipo_select: 'geral' }),
      logRow({ grupo_id: 'duda01', indice_aula: 0, tipo_ocorrencia: 'Raios e Trovões', tipo_select: 'geral' }),
      logRow({ grupo_id: 'duda02', indice_aula: 1, tipo_ocorrencia: 'Raios e Trovões', tipo_select: 'geral' }),
    ];
  };

  it('toggle ON: apaga só as linhas do professor da origem', async () => {
    seedLogs();
    setToggle({ [T1]: true });

    const { count } = await cancelarBO(T1, DATA, 0, 'jeff01');
    expect(count).toBe(2); // fonte jeff01 + extrapolado jeff02

    const restantes = store.chamadas_log.map((l) => l.grupo_id).sort();
    expect(restantes).toEqual(['duda01', 'duda02']);
  });

  it('toggle OFF: apaga todas as linhas do label (comportamento antigo)', async () => {
    seedLogs();
    setToggle({ [T1]: false });

    const { count } = await cancelarBO(T1, DATA, 0, 'jeff01');
    expect(count).toBe(4);
    expect(store.chamadas_log.length).toBe(0);
  });
});

describe('obterCardAula com filtro de professor (leitura do card do dia)', () => {
  it('retorna só o card do professor filtrado', async () => {
    store.card_aula = [
      { tenant_id: T1, data: DATA, indice_aula: 0, status_sugerido: 'AULA_NORMAL', professor_id: 'jeff' },
      { tenant_id: T1, data: DATA, indice_aula: 0, status_sugerido: 'AULA_CANCELADA', professor_id: 'duda' },
    ];

    const doJeff = await obterCardAula(DATA, T1, 'jeff');
    expect(doJeff).toHaveLength(1);
    expect(doJeff[0].professor_id).toBe('jeff');

    const todos = await obterCardAula(DATA, T1);
    expect(todos).toHaveLength(2);
  });

  it('professor sem card próprio no dia retorna [] (não cai no fallback compartilhado)', async () => {
    store.card_aula = [
      { tenant_id: T1, data: DATA, indice_aula: 0, status_sugerido: 'AULA_CANCELADA', professor_id: 'duda' },
    ];
    // fallback de chamadas_log existiria, mas não pode vazar card de outro professor
    store.chamadas_log = [
      { tenant_id: T1, data: DATA, grupo_id: 'duda01', indice_aula: 0, condicao_clima: 'rain', status: 'cancelado' },
    ];

    const doJeff = await obterCardAula(DATA, T1, 'jeff');
    expect(doJeff).toEqual([]);
  });
});

describe('appSettingsController — extrapolacao_restrita é admin-only no PUT', () => {
  const fakeRes = () => {
    const res: any = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    return res;
  };

  it('PUT por professor comum retorna 403', async () => {
    const req: any = { params: { key: 'extrapolacao_restrita' }, body: { value: { [T1]: true } }, professorId: 'jeff' };
    const res = fakeRes();
    const next = jest.fn();

    await AppSettingsController.save(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(store.app_settings.length).toBe(0);
  });

  it('PUT por admin salva o valor por unidade', async () => {
    const req: any = { params: { key: 'extrapolacao_restrita' }, body: { value: { [T1]: true } }, professorId: 'admin' };
    const res = fakeRes();
    const next = jest.fn();

    await AppSettingsController.save(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ key: 'extrapolacao_restrita', value: { [T1]: true } });
    expect(store.app_settings[0].value).toEqual({ [T1]: true });
  });

  it('PUT de alunos_colunas_mobile segue liberado para não-admin (chave fora do admin-only)', async () => {
    const req: any = { params: { key: 'alunos_colunas_mobile' }, body: { value: { nome: 140 } }, professorId: 'jeff' };
    const res = fakeRes();
    const next = jest.fn();

    await AppSettingsController.save(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ key: 'alunos_colunas_mobile', value: { nome: 140 } });
  });

  it('chave fora da allowlist retorna 404', async () => {
    const req: any = { params: { key: 'chave_maliciosa' }, body: { value: {} }, professorId: 'admin' };
    const res = fakeRes();
    const next = jest.fn();

    await AppSettingsController.save(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
  });

  it('GET de extrapolacao_restrita é liberado para qualquer autenticado (CardBO lê o estado)', async () => {
    setToggle({ [T1]: true });
    const req: any = { params: { key: 'extrapolacao_restrita' }, professorId: 'jeff' };
    const res = fakeRes();
    const next = jest.fn();

    await AppSettingsController.get(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ key: 'extrapolacao_restrita', value: { [T1]: true } });
  });
});
