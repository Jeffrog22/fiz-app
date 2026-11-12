import { test, expect } from 'vitest';
import {
  deveMostrarGuiaNovidades,
  guiaDeTipo,
  guiaElegivel,
  guiaPorId,
  guiasDoTipo,
} from '../guiaVisualUtils';
import type { GuiaVisual } from '../../data/guiaVisual';

const guia = (overrides: Partial<GuiaVisual> = {}): GuiaVisual => ({
  id: 'g1',
  versao: 'v3.0.0',
  tipo: 'novidades',
  rotulo: 'Veja o que mudou',
  passos: [{ id: 'p1', title: 'Passo', content: 'Conteúdo' }],
  ...overrides,
});

test('guiaPorId encontra o guia pelo id', () => {
  const g = guia({ id: 'transferencia-nivel' });
  expect(guiaPorId([guia(), g], 'transferencia-nivel')).toBe(g);
  expect(guiaPorId([guia()], 'inexistente')).toBeNull();
});

test('guiaElegivel aceita guias de versoes ja instaladas', () => {
  expect(guiaElegivel(guia({ versao: 'v3.0.0' }), 'v3.2.0')).toBe(true);
  expect(guiaElegivel(guia({ versao: 'v3.0.0' }), 'v3.0.0')).toBe(true);
  expect(guiaElegivel(guia({ versao: 'v3.5.0' }), 'v3.2.0')).toBe(false);
  expect(guiaElegivel(null, 'v3.2.0')).toBe(false);
  expect(guiaElegivel(guia(), '')).toBe(false);
});

test('guiasDoTipo filtra por tipo e ordena da versao mais antiga para a mais nova', () => {
  const antigo = guia({ id: 'a', versao: 'v2.0.0' });
  const novo = guia({ id: 'b', versao: 'v3.0.0' });
  const futuro = guia({ id: 'c', versao: 'v9.0.0' });
  const boasVindas = guia({ id: 'd', versao: 'v1.0.0', tipo: 'boas-vindas' });

  const lista = guiasDoTipo([novo, futuro, antigo, boasVindas], 'novidades', 'v3.2.0');
  expect(lista.map((g) => g.id)).toEqual(['a', 'b']);
});

test('guiaDeTipo devolve o guia mais recente elegivel', () => {
  const antigo = guia({ id: 'a', versao: 'v2.0.0' });
  const novo = guia({ id: 'b', versao: 'v3.0.0' });
  expect(guiaDeTipo([antigo, novo], 'novidades', 'v3.2.0')?.id).toBe('b');
  expect(guiaDeTipo([antigo], 'novidades', 'v1.0.0')).toBeNull();
  expect(guiaDeTipo([], 'novidades', 'v3.2.0')).toBeNull();
});

test('entrada de novidades aparece apenas com guia elegivel e ainda nao visto', () => {
  expect(deveMostrarGuiaNovidades(guia(), false)).toBe(true);
  expect(deveMostrarGuiaNovidades(guia(), true)).toBe(false);
  expect(deveMostrarGuiaNovidades(null, false)).toBe(false);
});
