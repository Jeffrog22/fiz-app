import { sanitizeName, generateProfessorId } from '../idGenerator';

describe('sanitizeName', () => {
  it('remove acentos de nomes', () => {
    expect(sanitizeName('João')).toBe('joao');
    expect(sanitizeName('Mário')).toBe('mario');
    expect(sanitizeName('Coração')).toBe('coracao');
  });

  it('converte para minúsculas', () => {
    expect(sanitizeName('CARLOS')).toBe('carlos');
    expect(sanitizeName('Ana Clara')).toBe('anaclara');
  });

  it('remove caracteres especiais', () => {
    expect(sanitizeName('@dministrador!')).toBe('dministrador');
    expect(sanitizeName('João%Silva#')).toBe('joaosilva');
  });

  it('remove espaços', () => {
    expect(sanitizeName('Maria  Eduarda')).toBe('mariaeduarda');
    expect(sanitizeName('  espaco  ')).toBe('espaco');
  });

  it('retorna string vazia para nome vazio', () => {
    expect(sanitizeName('')).toBe('');
    expect(sanitizeName('   ')).toBe('');
  });
});

describe('generateProfessorId', () => {
  it('usa 3 primeiras letras quando não há colisão', () => {
    expect(generateProfessorId('Carlos', [])).toBe('car');
    expect(generateProfessorId('Ana', [])).toBe('ana');
  });

  it('avança na 3ª letra em caso de colisão', () => {
    expect(generateProfessorId('Carlos', ['car'])).toBe('cal');
  });

  it('usa escape letter para nomes curtos com colisão', () => {
    expect(generateProfessorId('Ca', ['ca'])).toBe('cax');
  });

  it('usa fallback com timestamp em caso extremo', () => {
    const allCombos: string[] = ['ca'];
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
      allCombos.push('ca' + ch);
    }
    const result = generateProfessorId('Ca', allCombos);
    expect(result).toMatch(/^cax\d$/);
  });

  it('lança erro para nome inválido após higienização', () => {
    expect(() => generateProfessorId('', [])).toThrow('Nome do professor inválido');
    expect(() => generateProfessorId('@#$', [])).toThrow('Nome do professor inválido');
  });

  it('resolve colisão com nomes compostos', () => {
    expect(generateProfessorId('Ana Carla', [])).toBe('ana');
    expect(generateProfessorId('Ana Carolina', ['ana'])).toBe('anc');
  });
});
