import { test, expect } from 'vitest';
import { csvBlob, montarCsv } from '../csv';

test('montarCsv inclui BOM UTF-8 e usa separador ponto-e-virgula', () => {
  const csv = montarCsv(['Aluno', 'Turma'], [['Ana Silva', 'Ter/Qui']]);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('Aluno;Turma');
  expect(csv).toContain('Ana Silva;Ter/Qui');
});

test('montarCsv escapa separador, aspas e quebra de linha', () => {
  const csv = montarCsv(['Aluno'], [['Maria; Souza'], ['João "Jr"', 'x']]);
  expect(csv).toContain('"Maria; Souza"');
  expect(csv).toContain('"João ""Jr"""');
});

test('montarCsv preserva acentos', () => {
  const csv = montarCsv(['Aluno'], [['João Conceição']]);
  expect(csv).toContain('João Conceição');
});

test('montarCsv aceita lista vazia de linhas', () => {
  const csv = montarCsv(['Aluno'], []);
  expect(csv.replace('\uFEFF', '')).toBe('Aluno');
});

test('csvBlob gera um blob UTF-8', () => {
  const blob = csvBlob(['Aluno'], [['Ana']]);
  expect(blob.type).toContain('text/csv');
  expect(blob.size).toBeGreaterThan(0);
});
