import { describe, it, expect, beforeEach } from 'vitest';
import {
  getVisitanteSessionBruta,
  getVisitanteSession,
  setVisitanteSession,
  clearVisitanteSession,
  isVisitanteAtivo,
  type VisitanteSession,
} from '../visitante';

function fakeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ exp }));
  return `${header}.${body}.assinatura`;
}

const sessaoValida: VisitanteSession = {
  token: fakeToken(Math.floor(Date.now() / 1000) + 3600),
  tenantId: 'bela-vista',
  nome: 'Visitante',
  isVisitante: true,
};

describe('sessão do Modo Visitante', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('grava e lê a sessão da sessionStorage', () => {
    setVisitanteSession(sessaoValida);
    expect(getVisitanteSessionBruta()).toEqual(sessaoValida);
    expect(getVisitanteSession()).toEqual(sessaoValida);
    expect(isVisitanteAtivo()).toBe(true);
  });

  it('retorna null quando não há sessão', () => {
    expect(getVisitanteSessionBruta()).toBeNull();
    expect(getVisitanteSession()).toBeNull();
    expect(isVisitanteAtivo()).toBe(false);
  });

  it('ignora JSON malformado', () => {
    sessionStorage.setItem('fiz_visitante', '{invalido');
    expect(getVisitanteSessionBruta()).toBeNull();
  });

  it('ignora sessão sem token, sem tenant ou sem isVisitante', () => {
    sessionStorage.setItem('fiz_visitante', JSON.stringify({ tenantId: 'vila', isVisitante: true }));
    expect(getVisitanteSessionBruta()).toBeNull();

    sessionStorage.setItem('fiz_visitante', JSON.stringify({ token: 'x', isVisitante: true }));
    expect(getVisitanteSessionBruta()).toBeNull();

    sessionStorage.setItem('fiz_visitante', JSON.stringify({ token: 'x', tenantId: 'vila' }));
    expect(getVisitanteSessionBruta()).toBeNull();
  });

  it('considera expirada a sessão com token vencido', () => {
    setVisitanteSession({ ...sessaoValida, token: fakeToken(Math.floor(Date.now() / 1000) - 60) });
    expect(getVisitanteSessionBruta()).not.toBeNull();
    expect(getVisitanteSession()).toBeNull();
    expect(isVisitanteAtivo()).toBe(false);
  });

  it('limpa a sessão', () => {
    setVisitanteSession(sessaoValida);
    clearVisitanteSession();
    expect(getVisitanteSessionBruta()).toBeNull();
  });
});
