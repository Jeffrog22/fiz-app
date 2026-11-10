import { describe, it, expect } from 'vitest';
import { isTokenExpirado } from '../jwt';

function fakeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.assinatura`;
}

describe('isTokenExpirado', () => {
  it('retorna true para token com exp no passado', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(isTokenExpirado(fakeToken({ exp }))).toBe(true);
  });

  it('retorna false para token com exp no futuro', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpirado(fakeToken({ exp }))).toBe(false);
  });

  it('retorna false quando o payload não tem exp numérico', () => {
    expect(isTokenExpirado(fakeToken({ professorId: 'visitante' }))).toBe(false);
  });

  it('retorna false para token malformado', () => {
    expect(isTokenExpirado('nao-e-um-jwt')).toBe(false);
  });
});
