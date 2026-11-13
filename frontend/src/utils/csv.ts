/**
 * Geracao de CSV compativel com o Excel em portugues.
 * - BOM UTF-8 (\uFEFF) para que os acentos sejam exibidos corretamente.
 * - Separador ';' (padrao pt-BR do Excel, o mesmo aceito pelo importador do app).
 */

const SEPARADOR = ';';

/** Escapa um valor: adiciona aspas quando houver separador, aspas ou quebra de linha */
function escapar(valor: string): string {
  const v = valor ?? '';
  if (v.includes('"') || v.includes(SEPARADOR) || v.includes('\n') || v.includes('\r')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Monta o conteudo CSV (com BOM) a partir de cabecalho e linhas */
export function montarCsv(cabecalho: string[], linhas: string[][]): string {
  const partes: string[] = [];
  if (cabecalho && cabecalho.length > 0) {
    partes.push(cabecalho.map((c) => escapar(c)).join(SEPARADOR));
  }
  for (const linha of linhas || []) {
    partes.push((linha || []).map((v) => escapar(String(v ?? ''))).join(SEPARADOR));
  }
  return '\uFEFF' + partes.join('\r\n');
}

/** Cria um Blob CSV pronto para download */
export function csvBlob(cabecalho: string[], linhas: string[][]): Blob {
  return new Blob([montarCsv(cabecalho, linhas)], {
    type: 'text/csv;charset=utf-8',
  });
}
