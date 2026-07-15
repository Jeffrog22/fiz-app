import fs from 'fs';
import path from 'path';

interface ParsedFile {
  tipo: string;
  ano: number;
  blocos: string[];
}

function parseFilename(nomeOriginal: string): { tipo: string; ano: number } {
  const base = path.parse(nomeOriginal).name;
  const match = base.match(/^(.+)[^a-zA-Z](\d{4})$/);
  if (!match) {
    throw new Error(
      `Nome de arquivo invalido: "${nomeOriginal}". Use o formato {tipo}-{ano}.{ext} ou {tipo} {ano}.{ext} (ex: infantil-2026.pdf, Planejamento Adulto 2026.pdf)`,
    );
  }
  return { tipo: match[1].toLowerCase().trim(), ano: parseInt(match[2], 10) };
}

function splitIntoBlocks(texto: string): string[] {
  const normalizado = texto.replace(/\r\n/g, '\n');
  const blocos = normalizado
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  return blocos.length > 0 ? blocos : [texto.trim()];
}

async function parsePdf(caminho: string): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const buffer = fs.readFileSync(caminho);
    const pdf = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await pdf.getText();
    return result.text || '';
  } catch (err) {
    console.error('[planejamentoParser] Erro ao extrair texto do PDF:', err);
    return '';
  }
}

export async function parseFile(caminho: string, nomeOriginal: string, tipoMime: string): Promise<ParsedFile> {
  const { tipo, ano } = parseFilename(nomeOriginal);

  let texto: string;

  if (tipoMime === 'application/pdf') {
    texto = await parsePdf(caminho);
  } else if (tipoMime === 'text/csv' || tipoMime === 'application/vnd.ms-excel' || tipoMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const raw = fs.readFileSync(caminho, 'utf-8');
    const linhas = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    texto = linhas.slice(1).join('\n');
  } else {
    texto = fs.readFileSync(caminho, 'utf-8');
  }

  const blocos = splitIntoBlocks(texto);

  return { tipo, ano, blocos };
}
