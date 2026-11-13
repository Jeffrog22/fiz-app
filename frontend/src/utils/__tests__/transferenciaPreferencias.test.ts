import {
  carregarProgramacaoPendente,
  limparProgramacaoPendente,
  salvarProgramacaoPendente,
} from '../transferenciaPreferencias';

const TENANT = 't1';
const PROFESSOR = 'prof1';

beforeEach(() => {
  sessionStorage.clear();
});

describe('transferenciaPreferencias (programacao pendente)', () => {
  it('salva, carrega e limpa a programacao pendente', () => {
    const valor = {
      alunoIds: ['a1', 'a2'],
      professorDestino: 'prof2',
      turmaDestino: 'turma-x',
      dataEfetiva: '2027-01-01',
      motivo: 'transferencia',
      mudarNivelTurma: false,
      nivelTurmaNovo: '',
    };

    salvarProgramacaoPendente(TENANT, PROFESSOR, valor);
    const carregado = carregarProgramacaoPendente(TENANT, PROFESSOR);
    expect(carregado).toEqual(valor);

    limparProgramacaoPendente(TENANT, PROFESSOR);
    expect(carregarProgramacaoPendente(TENANT, PROFESSOR)).toBeNull();
  });

  it('nao mistura programacao de professores diferentes', () => {
    const a = { alunoIds: ['a1'], professorDestino: 'p1', turmaDestino: 't1', dataEfetiva: '2027-01-01', motivo: '', mudarNivelTurma: false, nivelTurmaNovo: '' };
    const b = { alunoIds: ['a2'], professorDestino: 'p2', turmaDestino: 't2', dataEfetiva: '2027-02-01', motivo: '', mudarNivelTurma: false, nivelTurmaNovo: '' };

    salvarProgramacaoPendente(TENANT, 'prof-a', a);
    salvarProgramacaoPendente(TENANT, 'prof-b', b);

    expect(carregarProgramacaoPendente(TENANT, 'prof-a')).toEqual(a);
    expect(carregarProgramacaoPendente(TENANT, 'prof-b')).toEqual(b);
  });

  it('retorna null quando nao ha programacao salva', () => {
    expect(carregarProgramacaoPendente(TENANT, PROFESSOR)).toBeNull();
  });

  it('nao quebra quando o storage esta indisponível', () => {
    const original = sessionStorage.getItem;
    sessionStorage.getItem = vi.fn(() => {
      throw new Error('quota');
    });
    expect(() =>
      salvarProgramacaoPendente(TENANT, PROFESSOR, {
        alunoIds: [], professorDestino: '', turmaDestino: '', dataEfetiva: '', motivo: '', mudarNivelTurma: false, nivelTurmaNovo: '',
      }),
    ).not.toThrow();
    expect(() => carregarProgramacaoPendente(TENANT, PROFESSOR)).not.toThrow();
    sessionStorage.getItem = original;
  });
});
