/**
 * Utilitário para geração de ID de professor de 3 letras.
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
