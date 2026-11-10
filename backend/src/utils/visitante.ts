import crypto from 'crypto';

export const VISITANTE_TTL_SECONDS = 7200;

const NOMES = [
  'Ana', 'Beatriz', 'Bruno', 'Caio', 'Carla', 'Daniel', 'Davi', 'Eduarda',
  'Felipe', 'Fernanda', 'Gabriel', 'Giovana', 'Guilherme', 'Helena', 'Igor',
  'Isabela', 'Joao', 'Julia', 'Larissa', 'Leonardo', 'Leticia', 'Lucas',
  'Luiza', 'Marcos', 'Maria', 'Mateus', 'Nicolas', 'Olivia', 'Paulo',
  'Rafael', 'Rafaela', 'Renata', 'Rodrigo', 'Sofia', 'Thiago', 'Valentina',
  'Vinicius', 'Yasmin',
];

const SOBRENOMES = [
  'Almeida', 'Alves', 'Araujo', 'Barbosa', 'Barros', 'Batista', 'Cardoso',
  'Carvalho', 'Castro', 'Correia', 'Costa', 'Dias', 'Duarte', 'Ferreira',
  'Fonseca', 'Freitas', 'Garcia', 'Gomes', 'Goncalves', 'Lima', 'Lopes',
  'Machado', 'Martins', 'Melo', 'Mendes', 'Monteiro', 'Moraes', 'Moreira',
  'Nascimento', 'Nogueira', 'Oliveira', 'Pereira', 'Pinheiro', 'Ramos',
  'Reis', 'Ribeiro', 'Rocha', 'Rodrigues', 'Santos', 'Silva', 'Soares',
  'Souza', 'Teixeira', 'Vieira', 'Vasconcelos',
];

const ROTAS_VISITANTE: RegExp[] = [
  /^\/api\/alunos$/,
  /^\/api\/alunos\/enrollment$/,
  /^\/api\/turmas$/,
  /^\/api\/professores$/,
  /^\/api\/chamadas\/periodo$/,
  /^\/api\/chamadas\/clima$/,
  /^\/api\/chamadas\/card-aula\/daily\/[^/]+$/,
  /^\/api\/calendario$/,
];

function indiceDoHash(hash: Buffer, byte: number, tamanho: number): number {
  return hash[byte] % tamanho;
}

export function pseudonimizarNome(tenantId: string, id: string, tipo: 'aluno' | 'professor'): string {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const hash = crypto.createHmac('sha256', secret).update(`${tipo}:${tenantId}:${id}`).digest();
  const primeiro = NOMES[indiceDoHash(hash, 0, NOMES.length)];
  const sobrenome1 = SOBRENOMES[indiceDoHash(hash, 1, SOBRENOMES.length)].trim();
  const sobrenome2 = SOBRENOMES[indiceDoHash(hash, 2, SOBRENOMES.length)].trim();
  return `${primeiro} ${sobrenome1} ${sobrenome2}`;
}

export function podeAcessarVisitante(method: string, originalUrl: string): boolean {
  if (method === 'OPTIONS') return true;
  if (method !== 'GET') return false;
  const caminho = (originalUrl.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  return ROTAS_VISITANTE.some((rota) => rota.test(caminho));
}

export function sanitizarAluno(aluno: any, tenantId: string): any {
  return {
    id: aluno.id,
    nome: pseudonimizarNome(tenantId, aluno.id, 'aluno'),
    turma_id: aluno.turma_id ?? null,
    nivel: aluno.nivel ?? null,
    ativo: aluno.ativo,
  };
}

export function sanitizarProfessor(professor: any, tenantId: string): any {
  return {
    id: professor.id,
    nome: pseudonimizarNome(tenantId, professor.id, 'professor'),
  };
}

export function sanitizarTurma(turma: any): any {
  return {
    id: turma.id,
    label: turma.label,
    grupo_id: turma.grupo_id ?? null,
    horario: turma.horario,
    professor_id: turma.professor_id ?? null,
    nivel: turma.nivel ?? null,
    capacidade: turma.capacidade ?? null,
    faixa_etaria: turma.faixa_etaria ?? null,
    duracao_minutos: turma.duracao_minutos ?? null,
  };
}

export function sanitizarLog(log: any): any {
  return {
    id: log.id,
    data: log.data,
    grupo_id: log.grupo_id ?? null,
    indice_aula: log.indice_aula,
    status: log.status ?? null,
    condicao_clima: log.condicao_clima ?? null,
    temperatura_ext: log.temperatura_ext ?? null,
    temperatura_piscina: log.temperatura_piscina ?? null,
    cloro_ppm: log.cloro_ppm ?? null,
    sensacao: log.sensacao ?? null,
    origem: log.origem ?? null,
  };
}

export function sanitizarEvento(evento: any): any {
  return {
    id: evento.id,
    data: evento.data,
    tipo: evento.tipo,
  };
}

export function sanitizarEnrollment(periodo: any): any {
  return {
    aluno_id: periodo.aluno_id,
    turma_id: periodo.turma_id ?? null,
    data_inicio: periodo.data_inicio,
    data_fim: periodo.data_fim ?? null,
  };
}

export function sanitizarCardAula(card: any): any {
  return {
    indice_aula: card.indice_aula ?? null,
    temperatura_externa: card.temperatura_externa ?? null,
    temperatura_piscina: card.temperatura_piscina ?? null,
    cloro_ppm: card.cloro_ppm ?? null,
    condicao_clima: card.condicao_clima ?? null,
    sensacao: card.sensacao ?? null,
    status_sugerido: card.status_sugerido ?? null,
    motivo_sugerido: card.motivo_sugerido ?? null,
  };
}
