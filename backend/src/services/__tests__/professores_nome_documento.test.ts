// Quando true, o select com 'nome_documento' falha (simula migration 031 ainda não executada)
const mockFailNomeDoc = { value: false };

jest.mock('../supabaseClient', () => {
  const store: any[] = [
    { id: 'duda', tenant_id: 'bela-vista', nome: 'Duda', nome_documento: null },
    { id: 'jeff', tenant_id: 'bela-vista', nome: 'Jefferson', nome_documento: 'Jefferson Silva' },
  ];

  function from(_table: string) {
    const state: any = { op: 'select', filters: [], payload: null, cols: [] };
    const b: any = {
      select(...cols: string[]) {
        state.op = 'select';
        state.cols = cols.flatMap((c) => c.split(',').map((s) => s.trim()));
        return b;
      },
      update(payload: any) { state.op = 'update'; state.payload = payload; return b; },
      eq(col: string, val: any) { state.filters.push({ col, val }); return b; },
      order() { return b; },
      then(resolve: any, reject: any) {
        return Promise.resolve(exec()).then(resolve, reject);
      },
    };

    function exec(): { data: any; error: any } {
      if (state.op === 'select' && state.cols.includes('nome_documento') && mockFailNomeDoc.value) {
        return { data: null, error: { message: 'column professores.nome_documento does not exist' } };
      }
      const alvo = store.filter((r) => state.filters.every((f: any) => r[f.col] === f.val));
      if (state.op === 'update') {
        alvo.forEach((r) => Object.assign(r, state.payload));
        return { data: null, error: null };
      }
      // respeita as colunas do select (coluna ausente = campo indefinido, como no Supabase real)
      const projetar = (r: any) => {
        if (!state.cols.length || state.cols.includes('*')) return r;
        const out: any = {};
        for (const c of state.cols) out[c] = r[c];
        return out;
      };
      return { data: alvo.map(projetar), error: null };
    }

    return b;
  }

  return { supabase: { from }, default: {} };
});

import { ProfessoresController } from '../../controllers/professoresController';
import { montarProfMap, buscarProfessoresDocumento } from '../exportacaoService';
import { AppError } from '../../middleware/errorHandler';
import { supabase } from '../supabaseClient';

function fakeRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.end = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function atualizarReq(overrides: any = {}) {
  return {
    tenantId: 'bela-vista',
    professorId: 'duda',
    params: { id: 'duda' },
    body: { nome_documento: 'Eduarda Carvas' },
    ...overrides,
  } as any;
}

async function chamar(req: any) {
  const res = fakeRes();
  const next = jest.fn();
  await ProfessoresController.atualizar(req, res, next);
  return { res, next };
}

async function lerDoc(id: string): Promise<string | null> {
  const { data } = await supabase.from('professores').select('*').eq('id', id);
  return data?.[0]?.nome_documento ?? null;
}

describe('montarProfMap (documentos)', () => {
  it('prioriza nome_documento e faz trim', () => {
    const map = montarProfMap([
      { id: 'duda', nome: 'Duda', nome_documento: '  Eduarda Carvas  ' },
      { id: 'jeff', nome: 'Jefferson' },
    ]);
    expect(map.get('duda')).toBe('Eduarda Carvas');
    expect(map.get('jeff')).toBe('Jefferson');
  });

  it('fallback para nome quando nome_documento é null ou vazio', () => {
    const map = montarProfMap([
      { id: 'a', nome: 'Ana', nome_documento: null },
      { id: 'b', nome: 'Bia', nome_documento: '   ' },
    ]);
    expect(map.get('a')).toBe('Ana');
    expect(map.get('b')).toBe('Bia');
  });

  it('lista nula/vazia vira mapa vazio', () => {
    expect(montarProfMap(null).size).toBe(0);
    expect(montarProfMap(undefined).size).toBe(0);
    expect(montarProfMap([]).size).toBe(0);
  });
});

describe('ProfessoresController.atualizar (nome_documento)', () => {
  it('próprio professor salva o nome formal (204)', async () => {
    const { res, next } = await chamar(atualizarReq());
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(await lerDoc('duda')).toBe('Eduarda Carvas');
  });

  it('admin pode editar outro professor', async () => {
    const { res, next } = await chamar(atualizarReq({
      professorId: 'admin',
      params: { id: 'duda' },
      body: { nome_documento: 'Eduarda M. Carvas' },
    }));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(await lerDoc('duda')).toBe('Eduarda M. Carvas');
  });

  it('outro professor da unidade recebe 403 e nada muda', async () => {
    const antes = await lerDoc('duda');
    const { res, next } = await chamar(atualizarReq({ professorId: 'jeff', params: { id: 'duda' } }));
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
    expect(await lerDoc('duda')).toBe(antes);
  });

  it('string vazia limpa o nome_documento (null → volta a usar o nome de login)', async () => {
    await chamar(atualizarReq({ body: { nome_documento: '   ' } }));
    expect(await lerDoc('duda')).toBeNull();
  });

  it('rejeita corpo que não seja string/null (400)', async () => {
    const { next } = await chamar(atualizarReq({ body: { nome_documento: 123 } }));
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
  });

  it('rejeita nome com mais de 80 caracteres (400)', async () => {
    const { next } = await chamar(atualizarReq({ body: { nome_documento: 'x'.repeat(81) } }));
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(400);
  });
});

describe('buscarProfessoresDocumento (exports)', () => {
  it('retorna nome_documento quando a coluna existe', async () => {
    mockFailNomeDoc.value = false;
    const profs = await buscarProfessoresDocumento('bela-vista');
    const map = montarProfMap(profs);
    expect(map.get('jeff')).toBe('Jefferson Silva');
    expect(map.get('duda')).toBe('Duda');
  });

  it('fallback para o nome de login quando a migration 031 ainda não rodou', async () => {
    mockFailNomeDoc.value = true;
    try {
      const profs = await buscarProfessoresDocumento('bela-vista');
      expect(profs.length).toBeGreaterThan(0);
      expect(profs[0].nome_documento).toBeUndefined();
      expect(montarProfMap(profs).get('jeff')).toBe('Jefferson');
    } finally {
      mockFailNomeDoc.value = false;
    }
  });
});
