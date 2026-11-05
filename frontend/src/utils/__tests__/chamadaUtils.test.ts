import { describe, it, expect } from 'vitest';
import { ehAnotacaoIndividual } from '../chamadaUtils';

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
