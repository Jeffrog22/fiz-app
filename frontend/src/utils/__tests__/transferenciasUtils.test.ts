import { test, expect } from 'vitest';
import {
  calcularVisaoGeral,
  coletarMovimentos,
  comporTurma,
  hojeSaoPaulo,
  horariosSequenciaProfessor,
  isLoteAtivo,
  mesAnoDeData,
  nivelProjetadoPorTurma,
  primeiroDiaMesSeguinte,
  projetarComposicoes,
  projetarLotacaoDestino,
  sequenciaTurmasProfessor,
} from '../transferenciasUtils';
import type {
  Aluno,
  TransferenciaLote,
  TransferenciaLoteItem,
  TransferenciaNivelPendencia,
  Turma,
} from '../../types';

const aluno = (overrides: Partial<Aluno> = {}): Aluno => ({
  id: 'a1',
  tenant_id: 'bela-vista',
  nome: 'Aluno 1',
  ativo: true,
  turma_id: 'jeftq01',
  nivel: 'Iniciação',
  criado_em: '2026-01-01',
  ...overrides,
});

const turma = (overrides: Partial<Turma> = {}): Turma => ({
  id: 'u1',
  tenant_id: 'bela-vista',
  label: 'Ter/Qui',
  horario: '07:00',
  professor_id: 'jeff',
  nivel: 'Iniciação',
  capacidade: 10,
  grupo_id: 'jeftq01',
  criado_em: '2026-01-01',
  ...overrides,
});

const lote = (overrides: Partial<TransferenciaLote> = {}): TransferenciaLote => ({
  id: 'l1',
  tenant_id: 'bela-vista',
  professor_id: 'jeff',
  turma_destino: 'marqq01',
  data_efetiva: '2026-12-01',
  status: 'programado',
  criado_em: '2026-11-01',
  atualizado_em: '2026-11-01',
  ...overrides,
});

const item = (overrides: Partial<TransferenciaLoteItem> = {}): TransferenciaLoteItem => ({
  id: 'i1',
  lote_id: 'l1',
  tenant_id: 'bela-vista',
  aluno_id: 'a1',
  turma_origem: 'jeftq01',
  turma_destino: 'marqq01',
  status: 'pendente',
  criado_em: '2026-11-01',
  ...overrides,
});

test('primeiroDiaMesSeguinte usa o mes seguinte da referencia', () => {
  expect(primeiroDiaMesSeguinte('2026-11-12')).toBe('2026-12-01');
  expect(primeiroDiaMesSeguinte('2026-12-20')).toBe('2027-01-01');
  expect(primeiroDiaMesSeguinte('2026-01-31')).toBe('2026-02-01');
});

test('hojeSaoPaulo devolve data no formato YYYY-MM-DD', () => {
  expect(hojeSaoPaulo(new Date('2026-11-12T02:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('mesAnoDeData extrai competencia', () => {
  expect(mesAnoDeData('2026-12-01')).toEqual({ mes: 12, ano: 2026 });
  expect(mesAnoDeData(null)).toBeNull();
});

test('isLoteAtivo considera apenas programado e revisao', () => {
  expect(isLoteAtivo('programado')).toBe(true);
  expect(isLoteAtivo('revisao')).toBe(true);
  expect(isLoteAtivo('aplicado')).toBe(false);
  expect(isLoteAtivo('cancelado')).toBe(false);
  expect(isLoteAtivo(null)).toBe(false);
});

test('coletarMovimentos ignora lotes nao pendentes e itens ja aplicados', () => {
  const movimentos = coletarMovimentos(
    [
      lote({ id: 'l1' }),
      lote({ id: 'l2', status: 'aplicado' }),
      lote({ id: 'l3', status: 'cancelado' }),
    ],
    {
      l1: [item({ id: 'i1' }), item({ id: 'i2', aluno_id: 'a2', status: 'aplicado' })],
      l2: [item({ id: 'i3', lote_id: 'l2' })],
      l3: [item({ id: 'i4', lote_id: 'l3' })],
    },
  );

  expect(movimentos.length).toBe(1);
  expect(movimentos[0].aluno_id).toBe('a1');
  expect(movimentos[0].turma_origem).toBe('jeftq01');
  expect(movimentos[0].turma_destino).toBe('marqq01');
});

test('comporTurma desconta saidas e soma entradas', () => {
  const alunos = [
    aluno({ id: 'a1', turma_id: 'jeftq01' }),
    aluno({ id: 'a2', turma_id: 'jeftq01' }),
    aluno({ id: 'a3', turma_id: 'jeftq01' }),
  ];
  const movimentos = coletarMovimentos([lote()], {
    l1: [item({ aluno_id: 'a1' }), item({ id: 'i2', aluno_id: 'a3' })],
  });

  const origem = comporTurma('jeftq01', alunos, movimentos);
  expect(origem.alunos.map((a) => a.id)).toEqual(['a2']);
  expect(origem.saidas.map((a) => a.id).sort()).toEqual(['a1', 'a3']);
  expect(origem.entradas.length).toBe(0);

  const destino = comporTurma('marqq01', alunos, movimentos);
  expect(destino.alunos.map((a) => a.id).sort()).toEqual(['a1', 'a3']);
  expect(destino.entradas.map((a) => a.id).sort()).toEqual(['a1', 'a3']);
  expect(destino.saidas.length).toBe(0);
});

test('calcularVisaoGeral projeta lotacao das turmas afetadas', () => {
  const alunos = [
    aluno({ id: 'a1', turma_id: 'jeftq01' }),
    aluno({ id: 'a2', turma_id: 'jeftq01' }),
    aluno({ id: 'a3', turma_id: 'jeftq01' }),
  ];
  const turmas = [
    turma({ grupo_id: 'jeftq01' }),
    turma({ id: 'u2', grupo_id: 'marqq01', horario: '09:00', professor_id: 'duda', capacidade: 5 }),
  ];
  const professorMap = new Map([['jeff', 'Jeff'], ['duda', 'Duda']]);

  const linhas = calcularVisaoGeral({
    lotes: [lote()],
    itensPorLote: { l1: [item({ aluno_id: 'a1' })] },
    alunosAtivos: alunos,
    turmas,
    professorMap,
  });

  expect(linhas.length).toBe(2);

  const origem = linhas.find((l) => l.grupo_id === 'jeftq01')!;
  expect(origem.papel).toBe('origem');
  expect(origem.lotacao_atual).toBe(3);
  expect(origem.saidas).toBe(1);
  expect(origem.entradas).toBe(0);
  expect(origem.lotacao_projetada).toBe(2);
  expect(origem.permanentes).toBe(2);
  expect(origem.professor_nome).toBe('Jeff');

  const destino = linhas.find((l) => l.grupo_id === 'marqq01')!;
  expect(destino.papel).toBe('destino');
  expect(destino.lotacao_atual).toBe(0);
  expect(destino.entradas).toBe(1);
  expect(destino.lotacao_projetada).toBe(1);
  expect(destino.professor_nome).toBe('Duda');
});

test('calcularVisaoGeral marca papel "ambos" quando a turma é origem e destino', () => {
  const linhas = calcularVisaoGeral({
    lotes: [lote()],
    itensPorLote: {
      l1: [item({ aluno_id: 'a1', turma_origem: 'marqq01', turma_destino: 'marqq01' })],
    },
    alunosAtivos: [aluno({ id: 'a1', turma_id: 'marqq01' })],
    turmas: [turma({ grupo_id: 'marqq01' })],
  });

  expect(linhas.length).toBe(1);
  expect(linhas[0].papel).toBe('ambos');
});

test('projetarLotacaoDestino soma entradas e desconta saidas do bloco', () => {
  const alunos = [
    aluno({ id: 'a1', turma_id: 'jeftq01' }),
    aluno({ id: 'a2', turma_id: 'jeftq01' }),
    aluno({ id: 'a3', turma_id: 'marqq01' }),
  ];
  const destino = turma({ id: 'u2', grupo_id: 'marqq01', capacidade: 5 });

  const projecao = projetarLotacaoDestino({
    turmaDestino: destino,
    alunosAtivos: alunos,
    alunoIdsSelecionados: ['a1'],
  });

  expect(projecao.lotacao_atual).toBe(1);
  expect(projecao.entradas).toBe(1);
  expect(projecao.saidas).toBe(0);
  expect(projecao.projetado).toBe(2);
  expect(projecao.vagas_restantes).toBe(3);
});

test('projetarLotacaoDestino desconta aluno que ja esta no destino', () => {
  const alunos = [aluno({ id: 'a1', turma_id: 'marqq01' })];
  const destino = turma({ id: 'u2', grupo_id: 'marqq01', capacidade: 5 });

  const projecao = projetarLotacaoDestino({
    turmaDestino: destino,
    alunosAtivos: alunos,
    alunoIdsSelecionados: ['a1'],
  });

  expect(projecao.saidas).toBe(1);
  expect(projecao.entradas).toBe(0);
  expect(projecao.projetado).toBe(0);
});

const pendencia = (overrides: Partial<TransferenciaNivelPendencia> = {}): TransferenciaNivelPendencia => ({
  id: 'p1',
  tenant_id: 'bela-vista',
  turma_grupo_id: 'marqq01',
  nivel_atual: '4',
  nivel_novo: '3',
  data_efetiva: '2026-12-01',
  status: 'pendente',
  criado_em: '2026-11-01',
  atualizado_em: '2026-11-01',
  ...overrides,
});

test('sequenciaTurmasProfessor percorre blocos (LABEL_ORDER) e horarios crescentes', () => {
  const turmas = [
    turma({ grupo_id: 'jeftq03', label: 'Ter/Qui', horario: '13:45' }),
    turma({ grupo_id: 'jeftq01', label: 'Ter/Qui', horario: '07:00' }),
    turma({ grupo_id: 'jeftq02', label: 'Ter/Qui', horario: '09:00' }),
    turma({ grupo_id: 'jeffqs01', label: 'Qua/Sex', horario: '08:00' }),
    turma({ grupo_id: 'jeffqs02', label: 'Qua/Sex', horario: '07:00' }),
  ];

  const sequencia = sequenciaTurmasProfessor(turmas, 'jeff');

  // LABEL_ORDER: Ter/Qui (8) antes de Qua/Sex (12); dentro do bloco, horario crescente
  expect(sequencia.map((t) => t.grupo_id)).toEqual([
    'jeftq01',
    'jeftq02',
    'jeftq03',
    'jeffqs02',
    'jeffqs01',
  ]);
});

test('sequenciaTurmasProfessor ignora turmas de outros professores', () => {
  const turmas = [
    turma({ grupo_id: 'jeftq01', professor_id: 'jeff' }),
    turma({ id: 'u2', grupo_id: 'marqq01', professor_id: 'duda', label: 'Ter/Qui', horario: '09:00' }),
  ];
  expect(sequenciaTurmasProfessor(turmas, 'jeff').map((t) => t.grupo_id)).toEqual(['jeftq01']);
  expect(sequenciaTurmasProfessor(turmas, '')).toEqual([]);
});

test('horariosSequenciaProfessor lista os horarios sem repetir', () => {
  const turmas = [
    turma({ grupo_id: 'jeftq01', horario: '07:00' }),
    turma({ id: 'u2', grupo_id: 'jeftq02', horario: '09:00' }),
    turma({ id: 'u3', grupo_id: 'jeffqs01', label: 'Qua/Sex', horario: '07:00' }),
  ];
  expect(horariosSequenciaProfessor(turmas, 'jeff')).toEqual(['07:00', '09:00']);
});

test('nivelProjetadoPorTurma usa a proposta pendente e sinaliza conflito', () => {
  const mapa = nivelProjetadoPorTurma([
    pendencia(),
    pendencia({ id: 'p2', turma_grupo_id: 'jeftq01', nivel_novo: '5', status: 'conflito' }),
  ]);

  expect(mapa.get('marqq01')?.nivel).toBe('3');
  expect(mapa.get('marqq01')?.conflito).toBe(false);
  expect(mapa.get('jeftq01')?.conflito).toBe(true);
  expect(mapa.get('inexistente')).toBeUndefined();
});

test('projetarComposicoes aplica a projecao hibrida em todas as turmas', () => {
  const alunos = [
    aluno({ id: 'a1', turma_id: 'jeftq01' }),
    aluno({ id: 'a2', turma_id: 'jeftq01' }),
    aluno({ id: 'a3', turma_id: 'marqq01' }),
  ];
  const turmas = [
    turma({ grupo_id: 'jeftq01', nivel: '2B' }),
    turma({ id: 'u2', grupo_id: 'marqq01', horario: '09:00', professor_id: 'duda', nivel: '4' }),
  ];
  const movimentos = coletarMovimentos([lote()], {
    l1: [item({ aluno_id: 'a1', turma_origem: 'jeftq01', turma_destino: 'marqq01' })],
  });

  const projecoes = projetarComposicoes({
    turmas,
    alunosAtivos: alunos,
    movimentos,
    pendenciasNivel: [pendencia()],
  });

  const origem = projecoes.find((p) => p.turma.grupo_id === 'jeftq01')!;
  expect(origem.alunos.map((a) => a.id)).toEqual(['a2']);
  expect(origem.saidas.map((a) => a.id)).toEqual(['a1']);
  expect(origem.nivelAtual).toBe('2B');

  const destino = projecoes.find((p) => p.turma.grupo_id === 'marqq01')!;
  expect(destino.alunos.map((a) => a.id).sort()).toEqual(['a1', 'a3']);
  expect(destino.entradas.map((a) => a.id)).toEqual(['a1']);
  // Nivel projetado (mudanca da turma) vale para quem permanece e para quem entra
  expect(destino.nivelProjetado).toBe('3');
});

test('calcularVisaoGeral exibe o nivel projetado e o conflito', () => {
  const linhas = calcularVisaoGeral({
    lotes: [lote()],
    itensPorLote: { l1: [item({ aluno_id: 'a1' })] },
    alunosAtivos: [aluno({ id: 'a1', turma_id: 'jeftq01' })],
    turmas: [
      turma({ grupo_id: 'jeftq01' }),
      turma({ id: 'u2', grupo_id: 'marqq01', horario: '09:00', professor_id: 'duda', nivel: '4' }),
    ],
    pendenciasNivel: [pendencia()],
  });

  const destino = linhas.find((l) => l.grupo_id === 'marqq01')!;
  expect(destino.nivel).toBe('4');
  expect(destino.nivel_projetado).toBe('3');
  expect(destino.conflito_nivel).toBe(false);
});
