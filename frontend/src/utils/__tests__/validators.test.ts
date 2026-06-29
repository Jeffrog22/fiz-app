import { describe, it, expect } from 'vitest';
import {
  validarNome,
  validarCSV,
  validarData,
  validarHora,
  validarTelefone,
  sanitizarInput,
} from '../validators';

describe('validarNome', () => {
  it('retorna erro se vazio', () => {
    expect(validarNome('')).toBe('Preencha o nome do professor');
    expect(validarNome('   ')).toBe('Preencha o nome do professor');
  });
  it('retorna null para nome valido', () => {
    expect(validarNome('Jefferson')).toBeNull();
  });
});

describe('validarCSV', () => {
  it('retorna erro se extensao nao for csv', () => {
    const file = new File([''], 'dados.txt', { type: 'text/plain' });
    expect(validarCSV(file)).toBe('Arquivo inv\u00e1lido. Use o template oficial (.csv).');
  });
  it('retorna null se file for null', () => {
    expect(validarCSV(null)).toBeNull();
  });
  it('retorna null para csv valido', () => {
    const file = new File(['a,b,c\n1,2,3'], 'dados.csv', { type: 'text/csv' });
    expect(validarCSV(file)).toBeNull();
  });
});

describe('validarData', () => {
  it('retorna erro se nao tiver 8 digitos', () => {
    expect(validarData('29/10/201')).toBe('Data deve ter 8 d\u00edgitos (dd/mm/aaaa)');
  });
  it('retorna erro se mes invalido', () => {
    expect(validarData('29/13/2013')).toBe('M\u00eas inv\u00e1lido');
  });
  it('retorna null para data valida', () => {
    expect(validarData('29/10/2013')).toBeNull();
  });
});

describe('validarHora', () => {
  it('retorna erro se nao tiver 4 digitos', () => {
    expect(validarHora('080')).toBe('Hor\u00e1rio deve ter 4 d\u00edgitos (0000)');
  });
  it('retorna erro se hora > 23', () => {
    expect(validarHora('2500')).toBe('Hora inv\u00e1lida (00-23)');
  });
  it('retorna null para hora valida', () => {
    expect(validarHora('0800')).toBeNull();
  });
});

describe('validarTelefone', () => {
  it('retorna null se vazio', () => {
    expect(validarTelefone('')).toBeNull();
  });
  it('retorna erro se < 10 digitos', () => {
    expect(validarTelefone('119876543')).toBe('Telefone deve ter 10 ou 11 d\u00edgitos');
  });
  it('retorna null para 11 digitos', () => {
    expect(validarTelefone('(11) 98765-4321')).toBeNull();
  });
});

describe('sanitizarInput', () => {
  it('remove caracteres perigosos', () => {
    expect(sanitizarInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
  });
  it('retorna string limpa', () => {
    expect(sanitizarInput('Joao Silva')).toBe('Joao Silva');
  });
});
