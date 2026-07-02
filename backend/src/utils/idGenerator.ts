/**
 * Utilitário para geração de IDs: professor (3 letras) e grupo_id (turmas).
 *
 * Regras:
 * 1. Higienização: minúsculas, sem acentos, sem caracteres especiais, sem espaços.
 * 2. Regra padrão: 3 primeiras letras do nome higienizado.
 * 3. Regra de colisão: mantém 2 primeiras letras, avança na 3ª letra pelo restante do nome.
 * 4. Regra de escape: se esgotar o nome, usa X, W, Y, Z nessa ordem.
 */

/**
 * Remove acentos e caracteres especiais, converte para minúsculas e remove espaços.
 */
export function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais (mantém espaços)
    .replace(/\s+/g, '') // Remove todos os espaços (nomes compostos colados)
    .trim();
}

/**
 * Verifica se um ID já existe na lista de IDs existentes.
 */
function idExists(id: string, existingIds: string[]): boolean {
  return existingIds.includes(id.toLowerCase());
}

/**
 * Gera um ID de 3 letras único baseado no nome do professor.
 * 
 * @param name Nome do professor
 * @param existingIds Lista de IDs que já existem no banco
 * @returns ID de 3 letras único
 */
export function generateProfessorId(name: string, existingIds: string[]): string {
  const sanitized = sanitizeName(name);
  
  if (sanitized.length === 0) {
    throw new Error('Nome do professor inválido após higienização');
  }

  // Regra padrão: 3 primeiras letras
  let candidate = sanitized.substring(0, 3);
  if (!idExists(candidate, existingIds)) {
    return candidate.toLowerCase();
  }

  // Regra de colisão: mantém 2 primeiras, avança na 3ª pelo restante do nome
  const firstTwo = sanitized.substring(0, 2);
  const startIndex = 2;

  for (let i = startIndex; i < sanitized.length; i++) {
    candidate = firstTwo + sanitized[i];
    if (!idExists(candidate, existingIds)) {
      return candidate.toLowerCase();
    }
  }

  // Regra de escape: mantém 2 primeiras, usa X, W, Y, Z
  const escapeLetters = ['x', 'w', 'y', 'z'];
  for (const letter of escapeLetters) {
    candidate = firstTwo + letter;
    if (!idExists(candidate, existingIds)) {
      return candidate.toLowerCase();
    }
  }

  // Caso extremo (todas as combinações esgotadas), retorna com timestamp
  // Isso não deve acontecer na prática, mas é um fallback de segurança
  const fallback = firstTwo + 'x' + Date.now().toString().slice(-1);
  return fallback.toLowerCase();
}

/**
 * Mapa de dias da semana para iniciais (usado no grupo_id).
 */
const DAY_INITIALS: Record<string, string> = {
  'Segunda': 's',
  'Terça': 't',
  'Quarta': 'q',
  'Quinta': 'q',
  'Sexta': 's',
  'Sábado': 's',
  'Domingo': 'd',
};

/**
 * Gera um grupo_id único no formato: {professorId}{diaIniciais}{índice}.
 * Ex: "jeftq01" (jef + t + q + 01)
 *
 * @param professorId ID de 3 letras do professor (ex: "jef")
 * @param dias Array de nomes dos dias selecionados (ex: ["Terça","Quinta"])
 * @param existingGrupoIds Lista de grupo_ids já existentes no banco
 * @returns grupo_id único (ex: "jeftq03")
 */
export function generateGrupoId(
  professorId: string,
  dias: string[],
  existingGrupoIds: string[],
): string {
  const prefix = professorId.toLowerCase().slice(0, 3);
  const dayCode = dias
    .map((d) => DAY_INITIALS[d] || d.toLowerCase()[0])
    .join('');

  const prefixPattern = `${prefix}${dayCode}`;

  // Encontra o maior índice sequencial existente
  let maxSeq = 0;
  for (const gid of existingGrupoIds) {
    if (gid.startsWith(prefixPattern)) {
      const num = parseInt(gid.slice(prefixPattern.length), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefixPattern}${nextSeq}`;
}

/**
 * Extrai os nomes dos dias a partir de uma label de turma.
 * Ex: "Ter/Qui" → ["Terça", "Quinta"]
 */
export function parseDiasFromLabel(label: string): string[] {
  const ABBREV_MAP: Record<string, string> = {
    'Seg': 'Segunda',
    'Ter': 'Terça',
    'Qua': 'Quarta',
    'Qui': 'Quinta',
    'Sex': 'Sexta',
    'Sab': 'Sábado',
    'Dom': 'Domingo',
  };
  return label
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ABBREV_MAP[s] || s);
}

/**
 * Gera uma label legível a partir de array de dias.
 * Ex: ["Terça","Quinta"] → "Ter/Qui"
 */
export function gerarLabelFromDias(dias: string[]): string {
  const ABBREV: Record<string, string> = {
    'Segunda': 'Seg',
    'Terça': 'Ter',
    'Quarta': 'Qua',
    'Quinta': 'Qui',
    'Sexta': 'Sex',
    'Sábado': 'Sab',
    'Domingo': 'Dom',
  };
  return dias.map((d) => ABBREV[d] || d.slice(0, 3)).join('/');
}
