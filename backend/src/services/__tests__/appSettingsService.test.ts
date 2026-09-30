jest.mock('../supabaseClient', () => {
  const store: Record<string, any> = {};

  function from(_table: string) {
    const state: any = { op: 'select', filters: [], payload: null, single: false, returning: false };
    const b: any = {
      select() {
        if (state.op === 'upsert') state.returning = true;
        return b;
      },
      eq(col: string, val: any) { state.filters.push({ col, val }); return b; },
      maybeSingle() { state.op = 'select'; state.single = true; return b; },
      single() { state.single = true; return b; },
      upsert(payload: any, _opts?: any) { state.op = 'upsert'; state.payload = payload; return b; },
      then(resolve: any, reject: any) {
        return Promise.resolve(exec()).then(resolve, reject);
      },
    };

    function exec(): { data: any; error: null } {
      if (state.op === 'upsert') {
        store[state.payload.key] = { ...store[state.payload.key], ...state.payload };
        return { data: state.returning && state.single ? { value: store[state.payload.key].value } : null, error: null };
      }
      let row: any = null;
      for (const key of Object.keys(store)) {
        const candidato = store[key];
        if (state.filters.every((f: any) => candidato[f.col] === f.val)) { row = candidato; break; }
      }
      return { data: state.single ? row : row ? [row] : [], error: null };
    }

    return b;
  }

  return { supabase: { from } };
});

import * as appSettingsService from '../appSettingsService';

describe('appSettingsService', () => {
  test('getAppSetting retorna null quando a chave não existe', async () => {
    const result = await appSettingsService.getAppSetting('alunos_colunas_mobile');
    expect(result).toBeNull();
  });

  test('saveAppSetting persiste e getAppSetting retorna o valor salvo (global, sem tenant)', async () => {
    const valor = { nome: 140, nivel: 80, turma: 70, acoes: 64 };
    const salvo = await appSettingsService.saveAppSetting('alunos_colunas_mobile', valor);
    expect(salvo).toEqual(valor);

    const lido = await appSettingsService.getAppSetting('alunos_colunas_mobile');
    expect(lido).toEqual(valor);
  });

  test('saveAppSetting sobrescreve valor existente (upsert por key)', async () => {
    await appSettingsService.saveAppSetting('alunos_colunas_mobile', { nome: 100 });
    const atual = await appSettingsService.getAppSetting('alunos_colunas_mobile');
    expect(atual).toEqual({ nome: 100 });

    await appSettingsService.saveAppSetting('alunos_colunas_mobile', { nome: 180, acoes: 72 });
    const depois = await appSettingsService.getAppSetting('alunos_colunas_mobile');
    expect(depois).toEqual({ nome: 180, acoes: 72 });
  });

  test('chaves distintas não se misturam', async () => {
    await appSettingsService.saveAppSetting('outra_chave', { x: 1 });
    const lido = await appSettingsService.getAppSetting('alunos_colunas_mobile');
    expect(lido).toEqual({ nome: 180, acoes: 72 });
  });
});
