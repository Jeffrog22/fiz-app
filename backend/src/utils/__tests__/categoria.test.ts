import { calcularCategoria } from '../categoria';

const ANO = new Date().getFullYear();

describe('calcularCategoria', () => {
  it('usa idade do ano de nascimento, não a idade real', () => {
    expect(calcularCategoria('2015-10-09')).toBe('Petiz I');
    expect(calcularCategoria('2016-05-03')).toBe('Mirim II');
  });

  it('não considera mês/dia de nascimento (mesma categoria no mesmo ano)', () => {
    expect(calcularCategoria('2015-01-01')).toBe(calcularCategoria('2015-12-31'));
  });

  it('retorna Pré-Mirim para idade < 9 no ano', () => {
    expect(calcularCategoria(`${ANO - 5}-01-01`)).toBe('Pré-Mirim');
    expect(calcularCategoria(`${ANO - 8}-12-31`)).toBe('Pré-Mirim');
  });

  it('retorna Mirim I para 9 anos no ano', () => {
    expect(calcularCategoria(`${ANO - 9}-06-15`)).toBe('Mirim I');
  });

  it('retorna Mirim II para 10 anos no ano', () => {
    expect(calcularCategoria(`${ANO - 10}-06-15`)).toBe('Mirim II');
  });

  it('retorna Petiz I para 11 anos no ano', () => {
    expect(calcularCategoria(`${ANO - 11}-06-15`)).toBe('Petiz I');
  });

  it('retorna A20+ para 20-24 anos no ano', () => {
    expect(calcularCategoria(`${ANO - 22}-06-15`)).toBe('A20+');
  });

  it('retorna M80+ para 80+ anos no ano', () => {
    expect(calcularCategoria(`${ANO - 85}-06-15`)).toBe('M80+');
  });

  it('retorna undefined para data vazia ou undefined', () => {
    expect(calcularCategoria('')).toBeUndefined();
    expect(calcularCategoria(undefined)).toBeUndefined();
  });
});