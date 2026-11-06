import { describe, it, expect } from 'vitest';
import {
  ehAnotacaoIndividual,
  alunoEstavaNaTurma,
  resolverStatusCelula,
} from '../chamadaUtils';

describe('ehAnotacaoIndividual', () => {
  it('anotação individual manual (presente + motivo) conta como anotação', () => {
    expect(
      ehAnotacaoIndividual({ motivo: 'Chegou atrasado', status: 'presente' })
    ).toBe(true);
  });

  it('motivo sem status (linha manual sem presença) conta como anotação', () => {
    expect(ehAnotacaoIndividual({ motivo: 'Anotação avulsa', status: null })).toBe(
      true
    );
  });

  it('sem motivo não é anotação', () => {
    expect(ehAnotacaoIndividual({ status: 'presente' })).toBe(false);
    expect(ehAnotacaoIndividual(undefined)).toBe(false);
    expect(ehAnotacaoIndividual({ motivo: '', status: 'presente' })).toBe(false);
  });

  it('justificativa (status justificado) não é anotação', () => {
    expect(
      ehAnotacaoIndividual({ motivo: 'Consulta médica', status: 'justificado' })
    ).toBe(false);
  });

  it('célula cancelada não é anotação (o "C" já indica o cancelamento)', () => {
    expect(
      ehAnotacaoIndividual({ motivo: 'Água fria para iniciação', status: 'cancelado' })
    ).toBe(false);
  });

  it('clone de CardBO por aluno (cancelado + tipo_ocorrencia + tipo_select) não é anotação', () => {
    expect(
      ehAnotacaoIndividual({
        motivo: 'Aula cancelada devido a Manutenção/Incidente',
        status: 'cancelado',
        tipo_ocorrencia: 'Manutenção/Incidente',
        tipo_select: 'pessoal',
      })
    ).toBe(false);
  });

  it('registro legado de BO com status presente/falta (só tipo_ocorrencia) não é anotação', () => {
    expect(
      ehAnotacaoIndividual({
        motivo: 'Aula cancelada devido a Manutenção/Incidente',
        status: 'presente',
        tipo_ocorrencia: 'Manutenção/Incidente',
      })
    ).toBe(false);
    expect(
      ehAnotacaoIndividual({
        motivo: 'Aula cancelada devido a Manutenção/Incidente',
        status: 'falta',
        tipo_ocorrencia: 'Manutenção/Incidente',
      })
    ).toBe(false);
  });

  it('só tipo_select (sem tipo_ocorrencia) também não é anotação', () => {
    expect(
      ehAnotacaoIndividual({ motivo: 'Motivo BO', status: 'presente', tipo_select: 'geral' })
    ).toBe(false);
  });

  it('registro de BO legado sem status (null) com tipo_ocorrencia não é anotação', () => {
    expect(
      ehAnotacaoIndividual({
        motivo: 'Aula cancelada devido a Manutenção/Incidente',
        status: null,
        tipo_ocorrencia: 'Manutenção/Incidente',
      })
    ).toBe(false);
  });
});

describe('alunoEstavaNaTurma', () => {
  const periodos = [
    { turma_id: 'jeftq01', data_inicio: '2026-10-01', data_fim: '2026-10-31' },
    { turma_id: 'jeftq02', data_inicio: '2026-11-01', data_fim: null },
  ];

  it('retorna true dentro do período da turma exibida', () => {
    expect(alunoEstavaNaTurma(periodos, 'jeftq01', '2026-10-15')).toBe(true);
    expect(alunoEstavaNaTurma(periodos, 'jeftq02', '2026-11-20')).toBe(true);
  });

  it('retorna false antes do início e depois do fim', () => {
    expect(alunoEstavaNaTurma(periodos, 'jeftq01', '2026-09-30')).toBe(false);
    expect(alunoEstavaNaTurma(periodos, 'jeftq01', '2026-11-01')).toBe(false);
  });

  it('aceita período aberto (data_fim nula)', () => {
    expect(alunoEstavaNaTurma(periodos, 'jeftq02', '2030-01-01')).toBe(true);
  });

  it('retorna false para outra turma ou turma_id nulo', () => {
    expect(alunoEstavaNaTurma(periodos, 'jeftq03', '2026-10-15')).toBe(false);
    expect(
      alunoEstavaNaTurma([{ turma_id: null, data_inicio: '2026-10-01', data_fim: null }], 'jeftq01', '2026-10-15')
    ).toBe(false);
  });

  it('é fail-open sem turma ou sem períodos carregados', () => {
    expect(alunoEstavaNaTurma(undefined, 'jeftq01', '2026-10-15')).toBe(true);
    expect(alunoEstavaNaTurma(periodos, undefined, '2026-10-15')).toBe(true);
  });

  it('array vazio significa sem matrícula', () => {
    expect(alunoEstavaNaTurma([], 'jeftq01', '2026-10-15')).toBe(false);
  });
});

describe('resolverStatusCelula', () => {
  it('fora do período tem prioridade sobre evento e status', () => {
    expect(
      resolverStatusCelula({
        foraDoPeriodo: true,
        evento: 'ponte',
        statusAluno: 'presente',
        statusTurma: 'cancelado',
      })
    ).toBe('fora_periodo');
  });

  it('evento tem prioridade sobre status de aluno e turma', () => {
    expect(
      resolverStatusCelula({
        foraDoPeriodo: false,
        evento: 'ponte',
        statusAluno: 'presente',
        statusTurma: 'cancelado',
      })
    ).toBe('ponte');
  });

  it('status do aluno tem prioridade sobre o da turma', () => {
    expect(
      resolverStatusCelula({
        foraDoPeriodo: false,
        statusAluno: 'falta',
        statusTurma: 'presente',
      })
    ).toBe('falta');
  });

  it('usa o status da turma como fallback', () => {
    expect(
      resolverStatusCelula({
        foraDoPeriodo: false,
        statusTurma: 'justificado',
      })
    ).toBe('justificado');
  });

  it('retorna undefined quando não há nada', () => {
    expect(resolverStatusCelula({ foraDoPeriodo: false })).toBeUndefined();
  });
});
