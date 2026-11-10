import {
  pseudonimizarNome,
  podeAcessarVisitante,
  sanitizarAluno,
  sanitizarProfessor,
  sanitizarTurma,
  sanitizarLog,
  sanitizarEvento,
  sanitizarEnrollment,
  sanitizarCardAula,
} from '../visitante';

describe('modo visitante', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('gera nomes ficticios determinísticos e distintos', () => {
    const a = pseudonimizarNome('bela-vista', 'aluno-1', 'aluno');
    const b = pseudonimizarNome('bela-vista', 'aluno-1', 'aluno');
    const c = pseudonimizarNome('bela-vista', 'aluno-2', 'aluno');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.split(' ')).toHaveLength(3);
  });

  it('permite apenas GET nas rotas da allowlist', () => {
    expect(podeAcessarVisitante('GET', '/api/alunos')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/alunos?ativo=true')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/alunos/enrollment?ids=1')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/turmas/')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/professores')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/chamadas/periodo?inicio=1&fim=2')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/chamadas/clima')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/chamadas/card-aula/daily/2026-01-01')).toBe(true);
    expect(podeAcessarVisitante('GET', '/api/calendario?mes=1&ano=2026')).toBe(true);
  });

  it('bloqueia rotas e métodos fora da allowlist', () => {
    expect(podeAcessarVisitante('GET', '/api/anotacoes/lote')).toBe(false);
    expect(podeAcessarVisitante('GET', '/api/app-settings/alunos_colunas_mobile')).toBe(false);
    expect(podeAcessarVisitante('GET', '/api/calendario/periodo')).toBe(false);
    expect(podeAcessarVisitante('GET', '/api/chamadas/2026-01-01')).toBe(false);
    expect(podeAcessarVisitante('POST', '/api/alunos')).toBe(false);
    expect(podeAcessarVisitante('PUT', '/api/alunos/1')).toBe(false);
    expect(podeAcessarVisitante('DELETE', '/api/turmas/1')).toBe(false);
  });

  it('remove dados pessoais do aluno', () => {
    const aluno = sanitizarAluno({
      id: 'aluno-1',
      nome: 'Nome Real',
      data_nascimento: '2010-01-01',
      genero: 'M',
      contato: '123',
      par_q: true,
      atestado_medico: true,
      categoria: 'Petiz',
      turma_id: 'jeftq01',
      nivel: 'Nível 1',
      ativo: true,
    }, 'bela-vista');

    expect(aluno.id).toBe('aluno-1');
    expect(aluno.nome).not.toBe('Nome Real');
    expect(aluno.turma_id).toBe('jeftq01');
    expect(aluno).not.toHaveProperty('data_nascimento');
    expect(aluno).not.toHaveProperty('genero');
    expect(aluno).not.toHaveProperty('contato');
    expect(aluno).not.toHaveProperty('par_q');
    expect(aluno).not.toHaveProperty('atestado_medico');
    expect(aluno).not.toHaveProperty('categoria');
  });

  it('remove dados sensíveis de professor, log, evento e enrollment', () => {
    const professor = sanitizarProfessor({ id: 'jeff', nome: 'Jeff', hash: 'segredo', nome_documento: 'Jefferson' }, 'bela-vista');
    expect(professor).toEqual({ id: 'jeff', nome: expect.any(String) });
    expect(professor).not.toHaveProperty('hash');
    expect(professor).not.toHaveProperty('nome_documento');

    const log = sanitizarLog({
      id: 'log-1', data: '2026-01-01', grupo_id: 'jeftq01', indice_aula: 0,
      status: 'justificado', motivo: 'Consulta médica', tipo_ocorrencia: 'Atestado',
      tipo_select: 'pessoal', compromete_dia: true, temperatura_piscina: 27, cloro_ppm: 2,
    });
    expect(log.status).toBe('justificado');
    expect(log).not.toHaveProperty('motivo');
    expect(log).not.toHaveProperty('tipo_ocorrencia');
    expect(log).not.toHaveProperty('tipo_select');
    expect(log).not.toHaveProperty('compromete_dia');

    expect(sanitizarEvento({ id: 'e1', data: '2026-01-01', tipo: 'feriado', descricao: 'Feriado municipal' }))
      .toEqual({ id: 'e1', data: '2026-01-01', tipo: 'feriado' });

    expect(sanitizarEnrollment({ id: 'p1', tenant_id: 't', aluno_id: 'a1', turma_id: 'g1', nivel: 'N1', motivo: 'transferencia', data_inicio: '2026-01-01', data_fim: null, criado_em: 'x' }))
      .toEqual({ aluno_id: 'a1', turma_id: 'g1', data_inicio: '2026-01-01', data_fim: null });
  });

  it('mantém somente campos operacionais de turma e card', () => {
    const turma = sanitizarTurma({
      id: 't1', tenant_id: 'bela-vista', label: 'Ter/Qui', grupo_id: 'jeftq01',
      horario: '07:00', professor_id: 'jeff', nivel: 'N1', capacidade: 10,
      faixa_etaria: '+16', duracao_minutos: 45, criado_em: 'x',
    });
    expect(turma).toEqual({
      id: 't1', label: 'Ter/Qui', grupo_id: 'jeftq01', horario: '07:00',
      professor_id: 'jeff', nivel: 'N1', capacidade: 10, faixa_etaria: '+16', duracao_minutos: 45,
    });

    const card = sanitizarCardAula({
      id: 'c1', tenant_id: 't', data: '2026-01-01', indice_aula: 1,
      temperatura_externa: 30, temperatura_piscina: 27, cloro_ppm: 2,
      condicao_clima: 'ensolarado', sensacao: ['quente'], status_sugerido: 'AULA_NORMAL',
      motivo_sugerido: '', professor_id: 'jeff', criado_em: 'x',
    });
    expect(card.indice_aula).toBe(1);
    expect(card).not.toHaveProperty('professor_id');
    expect(card).not.toHaveProperty('id');
    expect(card).not.toHaveProperty('criado_em');
  });
});
