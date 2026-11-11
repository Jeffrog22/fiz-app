import { test, expect } from 'vitest';
import { filtrarNotas } from '../blocoDeNotasUtils';
import type { BlocoDeNotas } from '../../types';

const nota = (overrides: Partial<BlocoDeNotas> = {}): BlocoDeNotas => ({
  id: '1',
  tenant_id: 'bela-vista',
  professor_id: 'jeff',
  titulo: 'Iniciação',
  conteudo: '',
  tipo: 'texto',
  itens: [],
  cor: 'amarelo',
  fixada: false,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
  ...overrides,
});

test('busca sem distincao de maiusculas e acentos', () => {
  const notas = [nota({ titulo: 'Iniciação' })];
  expect(filtrarNotas(notas, 'iniciacao', 'todas').length).toBe(1);
  expect(filtrarNotas(notas, 'INICIACAO', 'todas').length).toBe(1);
  expect(filtrarNotas(notas, 'inicia', 'todas').length).toBe(1);
  expect(filtrarNotas(notas, 'outro', 'todas').length).toBe(0);
});

test('busca encontra no conteudo e nos itens da lista', () => {
  const notas = [
    nota({ titulo: 'A', conteudo: 'reuniao de planejamento' }),
    nota({
      tipo: 'lista',
      itens: [{ id: 'i1', texto: 'Comprar leite', concluido: false }],
    }),
    nota({ titulo: 'Z', conteudo: 'sem correspondencia' }),
  ];
  expect(filtrarNotas(notas, 'planejamento', 'todas').length).toBe(1);
  expect(filtrarNotas(notas, 'leite', 'todas').length).toBe(1);
  expect(filtrarNotas(notas, 'sem correspondencia', 'todas').length).toBe(1);
  expect(filtrarNotas(notas, 'inexistente', 'todas').length).toBe(0);
});

test('filtro Textos so retorna notas de texto', () => {
  const notas = [
    nota({ tipo: 'texto', titulo: 'T1' }),
    nota({ tipo: 'lista', titulo: 'L1' }),
    nota({ tipo: 'texto', titulo: 'T2' }),
  ];
  expect(filtrarNotas(notas, '', 'textos').map((n) => n.titulo)).toEqual(['T1', 'T2']);
});

test('filtro Listas so retorna notas de lista', () => {
  const notas = [
    nota({ tipo: 'texto', titulo: 'T1' }),
    nota({ tipo: 'lista', titulo: 'L1' }),
    nota({ tipo: 'lista', titulo: 'L2' }),
  ];
  expect(filtrarNotas(notas, '', 'listas').map((n) => n.titulo)).toEqual(['L1', 'L2']);
});

test('busca combinada com filtro', () => {
  const notas = [
    nota({ tipo: 'texto', titulo: 'Iniciacao de ano' }),
    nota({
      tipo: 'lista',
      titulo: 'Iniciacao de lista',
      itens: [{ id: 'i1', texto: 'item', concluido: false }],
    }),
    nota({ tipo: 'texto', titulo: 'Outro' }),
  ];
  const resultado = filtrarNotas(notas, 'iniciacao', 'textos');
  expect(resultado.map((n) => n.titulo)).toEqual(['Iniciacao de ano']);
});

test('sem busca retorna todas conforme filtro', () => {
  const notas = [nota(), nota({ tipo: 'lista' })];
  expect(filtrarNotas(notas, '', 'todas').length).toBe(2);
});
