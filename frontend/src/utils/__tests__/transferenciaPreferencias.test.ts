import { test, expect, beforeEach, afterEach } from 'vitest';
import {
  carregarPreferencia,
  salvarPreferencia,
} from '../transferenciaPreferencias';

const TIPO = 'destino';
const TENANT = 'bela-vista';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test('salva e carrega preferencia (round-trip)', () => {
  const valor = { professorId: 'p1', turmaGrupoId: 'jeftq01' };
  salvarPreferencia(TIPO, TENANT, 'prof1', valor);
  expect(carregarPreferencia(TIPO, TENANT, 'prof1', { professorId: '', turmaGrupoId: '' })).toEqual(valor);
});

test('isola por professor logado', () => {
  salvarPreferencia(TIPO, TENANT, 'prof1', { professorId: 'p1', turmaGrupoId: 't1' });
  salvarPreferencia(TIPO, TENANT, 'prof2', { professorId: 'p2', turmaGrupoId: 't2' });

  expect(
    carregarPreferencia(TIPO, TENANT, 'prof1', { professorId: '', turmaGrupoId: '' }),
  ).toEqual({ professorId: 'p1', turmaGrupoId: 't1' });
  expect(
    carregarPreferencia(TIPO, TENANT, 'prof2', { professorId: '', turmaGrupoId: '' }),
  ).toEqual({ professorId: 'p2', turmaGrupoId: 't2' });
});

test('isola por unidade (tenant)', () => {
  salvarPreferencia(TIPO, TENANT, 'prof1', { professorId: 'p1', turmaGrupoId: 't1' });
  salvarPreferencia(TIPO, 'sao-matheus', 'prof1', { professorId: 'p3', turmaGrupoId: 't3' });

  expect(
    carregarPreferencia(TIPO, TENANT, 'prof1', { professorId: '', turmaGrupoId: '' }),
  ).toEqual({ professorId: 'p1', turmaGrupoId: 't1' });
  expect(
    carregarPreferencia(TIPO, 'sao-matheus', 'prof1', { professorId: '', turmaGrupoId: '' }),
  ).toEqual({ professorId: 'p3', turmaGrupoId: 't3' });
});

test('retorna fallback quando nao existe preferencia', () => {
  const fallback = { professorId: '', turmaGrupoId: '' };
  expect(carregarPreferencia(TIPO, TENANT, 'prof1', fallback)).toEqual(fallback);
});

test('retorna fallback quando o valor armazenado esta corrompido', () => {
  localStorage.setItem(`tf_${TIPO}:${TENANT}:prof1`, 'não-é-json');
  expect(
    carregarPreferencia(TIPO, TENANT, 'prof1', { professorId: 'x', turmaGrupoId: 'y' }),
  ).toEqual({ professorId: 'x', turmaGrupoId: 'y' });
});

test('sobrescreve valor anterior ao salvar novamente', () => {
  salvarPreferencia(TIPO, TENANT, 'prof1', { professorId: 'p1', turmaGrupoId: 't1' });
  salvarPreferencia(TIPO, TENANT, 'prof1', { professorId: 'p2', turmaGrupoId: 't2' });
  expect(
    carregarPreferencia(TIPO, TENANT, 'prof1', { professorId: '', turmaGrupoId: '' }),
  ).toEqual({ professorId: 'p2', turmaGrupoId: 't2' });
});

test('suporta tipos diferentes de preferencia na mesma chave de professor', () => {
  salvarPreferencia('destino', TENANT, 'prof1', { professorId: 'p1', turmaGrupoId: 't1' });
  salvarPreferencia('previa', TENANT, 'prof1', { professorId: 'p2', turmaGrupoId: 't2', competencia: null });

  expect(
    carregarPreferencia('destino', TENANT, 'prof1', { professorId: '', turmaGrupoId: '' }),
  ).toEqual({ professorId: 'p1', turmaGrupoId: 't1' });
  expect(
    carregarPreferencia('previa', TENANT, 'prof1', { professorId: '', turmaGrupoId: '', competencia: null }),
  ).toEqual({ professorId: 'p2', turmaGrupoId: 't2', competencia: null });
});
