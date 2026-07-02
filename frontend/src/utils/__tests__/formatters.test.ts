import { describe, it, expect } from 'vitest';
import {
  formatarNomeMobile,
  calcIdade,
  calcCategoria,
  mascaraData,
  mascaraHora,
  mascaraTelefone,
  desmascarar,
  formatDateBR,
} from '../formatters';

describe('formatarNomeMobile', () => {
  it('abrevia nome completo: primeiro + ultimo sobrenome', () => {
    expect(formatarNomeMobile('Jefferson Roberto Costa')).toBe('Jefferson Costa');
  });

  it('mantem preposicao antes do ultimo sobrenome', () => {
    expect(formatarNomeMobile('Maria Augusta da Silva')).toBe('Maria da Silva');
  });

  it('retorna string original se tiver 1 ou 2 palavras', () => {
    expect(formatarNomeMobile('Joao')).toBe('Joao');
    expect(formatarNomeMobile('Joao Silva')).toBe('Joao Silva');
  });

  it('lida com nome composto', () => {
    expect(formatarNomeMobile('Joao Pedro Soares dos Santos')).toBe('Joao Pedro dos Santos');
  });
});

describe('calcIdade', () => {
  it('calcula idade corretamente', () => {
    const hoje = new Date();
    const anoPassado = new Date(hoje.getFullYear() - 10, hoje.getMonth(), hoje.getDate());
    const mes = String(anoPassado.getMonth() + 1).padStart(2, '0');
    const dia = String(anoPassado.getDate()).padStart(2, '0');
    const iso = `${anoPassado.getFullYear()}-${mes}-${dia}`;
    expect(calcIdade(iso)).toBe(10);
  });

  it('retorna null para data vazia', () => {
    expect(calcIdade('')).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(calcIdade(undefined)).toBeNull();
  });
});

describe('calcCategoria', () => {
  it('retorna Pré-Mirim para idade < 9', () => expect(calcCategoria(5)).toBe('Pré-Mirim'));
  it('retorna Mirim I para 9', () => expect(calcCategoria(9)).toBe('Mirim I'));
  it('retorna Petiz I para 11', () => expect(calcCategoria(11)).toBe('Petiz I'));
  it('retorna Infantil I para 13', () => expect(calcCategoria(13)).toBe('Infantil I'));
  it('retorna Júnior I para 17', () => expect(calcCategoria(17)).toBe('Júnior I'));
  it('retorna A20+ para 20-24', () => expect(calcCategoria(22)).toBe('A20+'));
  it('retorna B25+ para 25-29', () => expect(calcCategoria(27)).toBe('B25+'));
  it('retorna G50+ para 50-54', () => expect(calcCategoria(52)).toBe('G50+'));
  it('retorna M80+ para 80+', () => expect(calcCategoria(85)).toBe('M80+'));
  it('retorna string vazia para null', () => expect(calcCategoria(null)).toBe(''));
});

describe('mascaraData', () => {
  it('aplica mascara dd/mm/aaaa', () => {
    expect(mascaraData('29102013')).toBe('29/10/2013');
  });
  it('retorna parcial para menos de 8 digitos', () => {
    expect(mascaraData('29')).toBe('29');
    expect(mascaraData('2910')).toBe('29/10');
  });
});

describe('mascaraHora', () => {
  it('aplica mascara 00:00', () => {
    expect(mascaraHora('0800')).toBe('08:00');
  });
  it('retorna parcial para menos de 4 digitos', () => {
    expect(mascaraHora('08')).toBe('08');
  });
});

describe('mascaraTelefone', () => {
  it('aplica mascara (##) #####-#### para 11 digitos', () => {
    expect(mascaraTelefone('11987654321')).toBe('(11) 98765-4321');
  });
  it('aplica mascara (##) ####-#### para 10 digitos', () => {
    expect(mascaraTelefone('1198765432')).toBe('(11) 9876-5432');
  });
});

describe('desmascarar', () => {
  it('remove tudo que nao for digito', () => {
    expect(desmascarar('(11) 98765-4321')).toBe('11987654321');
    expect(desmascarar('29/10/2013')).toBe('29102013');
  });
});

describe('formatDateBR', () => {
  it('converte ISO para dd/mm/aaaa', () => {
    expect(formatDateBR('2013-10-29')).toBe('29/10/2013');
    expect(formatDateBR('')).toBe('');
  });
});
