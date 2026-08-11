import { isFaixaEtariaMaior16, getTempPiscinaSugestao } from '../climateEngine';

describe('isFaixaEtariaMaior16', () => {
  it('aceita variacoes com +16', () => {
    expect(isFaixaEtariaMaior16('+16')).toBe(true);
    expect(isFaixaEtariaMaior16('+ 16')).toBe(true);
    expect(isFaixaEtariaMaior16('+16 anos')).toBe(true);
    expect(isFaixaEtariaMaior16('+ 16 anos')).toBe(true);
  });

  it('aceita variacoes com >16', () => {
    expect(isFaixaEtariaMaior16('>16')).toBe(true);
    expect(isFaixaEtariaMaior16('> 16')).toBe(true);
    expect(isFaixaEtariaMaior16('>16 anos')).toBe(true);
    expect(isFaixaEtariaMaior16('> 16 anos')).toBe(true);
  });

  it('aceita variacoes com 16+', () => {
    expect(isFaixaEtariaMaior16('16+')).toBe(true);
    expect(isFaixaEtariaMaior16('16 +')).toBe(true);
    expect(isFaixaEtariaMaior16('16+ anos')).toBe(true);
    expect(isFaixaEtariaMaior16('16 + anos')).toBe(true);
  });

  it('aceita case-insensitive', () => {
    expect(isFaixaEtariaMaior16('>16 Anos')).toBe(true);
    expect(isFaixaEtariaMaior16('16+ ANOS')).toBe(true);
  });

  it('rejeita faixas que nao sao maior de 16', () => {
    expect(isFaixaEtariaMaior16('6-10 anos')).toBe(false);
    expect(isFaixaEtariaMaior16('11-16 anos')).toBe(false);
    expect(isFaixaEtariaMaior16('16-18 anos')).toBe(false);
    expect(isFaixaEtariaMaior16('adulto')).toBe(false);
    expect(isFaixaEtariaMaior16('')).toBe(false);
    expect(isFaixaEtariaMaior16(undefined)).toBe(false);
  });
});

describe('getTempPiscinaSugestao — exceção faixa maior 16', () => {
  it('entre 23 e 25 graus cancela para faixas comuns', () => {
    const res = getTempPiscinaSugestao(24, 'AVANÇADO', '6-10 anos');
    expect(res.status).toBe('AULA_CANCELADA');
    expect(res.motivo).toBe('Água muito fria para menores');
  });

  it('entre 23 e 25 graus justifica (nao cancela) para >16', () => {
    const res = getTempPiscinaSugestao(24, 'AVANÇADO', '>16');
    expect(res.status).toBe('FALTA_JUSTIFICADA');
    expect(res.motivo).toBe('Água muito fria');
  });

  it('entre 23 e 25 graus justifica para 16+ anos', () => {
    const res = getTempPiscinaSugestao(24, 'AVANÇADO', '16+ anos');
    expect(res.status).toBe('FALTA_JUSTIFICADA');
  });

  it('mantem o cancelamento para +16 abaixo de 23 graus', () => {
    const res = getTempPiscinaSugestao(22, 'AVANÇADO', '+16');
    expect(res.status).toBe('AULA_CANCELADA');
    expect(res.motivo).toBe('Água crítica');
  });
});
