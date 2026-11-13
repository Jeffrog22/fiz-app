import { conflitosAlunosHandler } from '../transferenciaLoteController';
import * as service from '../../services/transferenciaLoteService';

jest.mock('../../services/transferenciaLoteService', () => ({
  verificarConflitosAlunos: jest.fn(),
}));

const mockVerificarConflitosAlunos = service.verificarConflitosAlunos as jest.Mock;

const builder = () => {
  const req: any = { tenantId: 't1', query: {} };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('conflitosAlunosHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna os conflitos do service', async () => {
    const conflitos = [
      {
        aluno_id: 'a1',
        aluno_nome: 'Aluno 1',
        lote_id: 'lote-1',
        turma_destino: 'marqq01',
        data_efetiva: '2027-01-01',
        status: 'programado',
        turma_origem: 'jeftq01',
      },
    ];
    mockVerificarConflitosAlunos.mockResolvedValue(conflitos);
    const { req, res, next } = builder();
    req.query = { alunos: 'a1' };

    await conflitosAlunosHandler(req, res, next);

    expect(mockVerificarConflitosAlunos).toHaveBeenCalledWith('t1', ['a1']);
    expect(res.json).toHaveBeenCalledWith({ conflitos });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna vazio quando nao há alunos informados', async () => {
    mockVerificarConflitosAlunos.mockResolvedValue([]);
    const { req, res, next } = builder();
    req.query = {};

    await conflitosAlunosHandler(req, res, next);

    expect(mockVerificarConflitosAlunos).toHaveBeenCalledWith('t1', []);
    expect(res.json).toHaveBeenCalledWith({ conflitos: [] });
  });

  it('retorna 400 quando nao há tenant', async () => {
    const { req, res, next } = builder();
    req.tenantId = undefined;

    await conflitosAlunosHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('repassa erro do service para o next', async () => {
    const erro = new Error('boom');
    mockVerificarConflitosAlunos.mockRejectedValue(erro);
    const { req, res, next } = builder();
    req.query = { alunos: 'a1' };

    await conflitosAlunosHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(erro);
    expect(res.json).not.toHaveBeenCalled();
  });
});
