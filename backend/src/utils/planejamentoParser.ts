import fs from 'fs';
import path from 'path';

interface ParsedFile {
  tipo: string;
  ano: number;
  blocos: string[];
}

const MESES: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

export function parseRangeFromConteudo(conteudo: string, ano: number): { inicio: Date; fim: Date } | null {
  const linhas = conteudo.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (linhas.length < 2) return null;
  const mesNome = linhas[0].toUpperCase();
  const mesNum = MESES[mesNome];
  if (!mesNum) return null;
  const weekMatch = linhas[1].match(/\d+ª\s*semana:\s*(\d{1,2}(?:\/\d{1,2})?)\s*[àa]\s*(\d{1,2}(?:\/\d{1,2})?)/);
  if (!weekMatch) return null;
  const parseData = (raw: string, defaultMes: number): Date | null => {
    const parts = raw.split('/');
    let dia: number, mes: number;
    if (parts.length === 2) {
      dia = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10);
    } else {
      dia = parseInt(parts[0], 10);
      mes = defaultMes;
    }
    if (isNaN(dia) || isNaN(mes)) return null;
    return new Date(ano, mes - 1, dia);
  };
  let inicio = parseData(weekMatch[1], mesNum);
  let fim = parseData(weekMatch[2], mesNum);
  if (!inicio || !fim) return null;
  if (fim < inicio) fim = new Date(ano + 1, fim.getMonth(), fim.getDate());
  return { inicio, fim };
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
  const partes = normalizado.split(/^mês:\n([A-ZÀ-Ú]+)\n/gm);
  if (partes.length < 3) {
    const blocos = normalizado
      .split(/\n(?=\d+ª\s*semana:)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    return blocos.length > 0 ? blocos : [texto.trim()];
  }
  const blocos: string[] = [];
  for (let i = 1; i < partes.length; i += 2) {
    const mes = partes[i];
    const conteudo = partes[i + 1] || '';
    const semanas = conteudo
      .split(/\n(?=\d+ª\s*semana:)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    for (const semana of semanas) {
      blocos.push(`${mes}\n${semana}`);
    }
  }
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
