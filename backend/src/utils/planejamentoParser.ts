import fs from 'fs';
import path from 'path';

interface ParsedFile {
  tipo: string;
  ano: number;
  blocos: string[];
}

export const MESES: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

const HEADER_INFANTIL = 'MÊS;SEMANA;DATA_INI;DATA_FIM;NADO;N1;N2;N3;N4;CAPACIDADE;BRINCADEIRA;INCLUIR';
const HEADER_ADULTO = 'MÊS;SEMANA;DATA_INI;DATA_FIM;NADO;CAPACIDADE;MÉTODO;INCLUIR';

function extrairMesDoRange(weekLine: string): number | null {
  const matches = [...weekLine.matchAll(/\/(\d{1,2})/g)];
  if (matches.length > 0) {
    const m = parseInt(matches[matches.length - 1][1], 10);
    if (m >= 1 && m <= 12) return m;
  }
  return null;
}

export function parseRangeFromConteudo(conteudo: string, ano: number): { inicio: Date; fim: Date } | null {
  const linhas = conteudo.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (linhas.length === 0) return null;

  const primeira = linhas[0].toUpperCase();
  const isNovoFormato = !!MESES[primeira];

  const semanaIdx = isNovoFormato ? 1 : 0;
  if (semanaIdx >= linhas.length) return null;
  const weekMatch = linhas[semanaIdx].match(/\d+ª\s*semana:\s*(\d{1,2}(?:\/\d{1,2}(?:\/\d{2,4})?)?)\s*[àa]\s*(\d{1,2}(?:\/\d{1,2}(?:\/\d{2,4})?)?)/);
  if (!weekMatch) return null;

  const rawStart = weekMatch[1];
  const rawEnd = weekMatch[2];

  const parseExpl = (raw: string): { dia: number; mes?: number; ano?: number } | null => {
    const parts = raw.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const a = parseInt(parts[2], 10);
      if (isNaN(d) || isNaN(m) || isNaN(a)) return null;
      return { dia: d, mes: m, ano: a };
    }
    if (parts.length === 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(d) || isNaN(m)) return null;
      return { dia: d, mes: m };
    }
    const d = parseInt(parts[0], 10);
    if (isNaN(d)) return null;
    return { dia: d };
  };

  const startInfo = parseExpl(rawStart);
  const endInfo = parseExpl(rawEnd);
  if (!startInfo || !endInfo) return null;

  const startAno = startInfo.ano || ano;
  const endAno = endInfo.ano || ano;

  const mesNome = isNovoFormato ? primeira : '';
  const mesLinha = isNovoFormato ? (MESES[mesNome] || null) : null;
  const mesRange = extrairMesDoRange(linhas[semanaIdx]);
  const mesFallback = mesLinha || mesRange;

  let startMes: number;
  let endMes: number;

  if (startInfo.mes !== undefined && endInfo.mes !== undefined) {
    startMes = startInfo.mes;
    endMes = endInfo.mes;
  } else if (startInfo.mes !== undefined && endInfo.mes === undefined) {
    startMes = startInfo.mes;
    endMes = startMes;
  } else if (startInfo.mes === undefined && endInfo.mes !== undefined) {
    endMes = endInfo.mes;
    if (endInfo.dia < startInfo.dia) {
      startMes = endMes - 1;
      if (startMes < 1) startMes = 12;
    } else {
      startMes = endMes;
    }
  } else {
    if (!mesFallback) return null;
    startMes = mesFallback;
    endMes = mesFallback;
  }

  let inicio = new Date(startAno, startMes - 1, startInfo.dia);
  let fim = new Date(endAno, endMes - 1, endInfo.dia);
  if (fim < inicio) fim = new Date(endAno + 1, fim.getMonth(), fim.getDate());
  return { inicio, fim };
}

export function extrairMesDoConteudo(conteudo: string): number | null {
  const linhas = conteudo.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (linhas.length === 0) return null;
  const primeira = linhas[0].toUpperCase();
  if (MESES[primeira]) return MESES[primeira];
  for (const linha of linhas) {
    const m = extrairMesDoRange(linha);
    if (m) return m;
  }
  return null;
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

function parseCsvTemplate(linhas: string[]): string[] {
  if (linhas.length < 2) return [];

  const primeira = linhas[0].trim();

  let isInfantil = false;
  let isAdulto = false;

  if (primeira === HEADER_INFANTIL) {
    isInfantil = true;
  } else if (primeira === HEADER_ADULTO) {
    isAdulto = true;
  } else {
    return [];
  }

  const dados = linhas.slice(1);
  const blocos: string[] = [];

  for (const linha of dados) {
    const cols = linha.split(';').map((c) => c.trim());
    if (cols.length < 4) continue;

    if (isInfantil && cols.length >= 10) {
      const [, semana, dataIni, dataFim, nado, n1, n2, n3, n4, capacidade, brincadeira, incluir] = cols;
      if (nado.toUpperCase() === 'FÉRIAS') {
        blocos.push(`${cols[0]}\n${semana}ª semana: ${dataIni} à ${dataFim}\nFÉRIAS`);
        continue;
      }
      let block = `${cols[0]}\n${semana}ª semana: ${dataIni} à ${dataFim}\nNado: ${nado}\nN1: ${n1}\nN2: ${n2}\nN3: ${n3}\nN4: ${n4}\nCapacidade: ${capacidade}`;
      if (brincadeira) block += `\nBrincadeira: ${brincadeira}`;
      if (incluir) block += `\n${incluir}`;
      blocos.push(block);
    } else if (isAdulto && cols.length >= 6) {
      const [, semana, dataIni, dataFim, nado, capacidade, metodo, incluir] = cols;
      if (nado.toUpperCase() === 'FÉRIAS') {
        blocos.push(`${cols[0]}\n${semana}ª semana: ${dataIni} à ${dataFim}\nFÉRIAS`);
        continue;
      }
      let block = `${cols[0]}\n${semana}ª semana: ${dataIni} à ${dataFim}\nNado: ${nado}\nCapacidade: ${capacidade}\nMétodo: ${metodo}`;
      if (incluir) block += `\n${incluir}`;
      blocos.push(block);
    }
  }

  return blocos;
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

  if (tipoMime === 'text/csv' || tipoMime === 'application/vnd.ms-excel' || tipoMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const raw = fs.readFileSync(caminho, 'utf-8');
    const linhas = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const csvBlocos = parseCsvTemplate(linhas);
    if (csvBlocos.length > 0) {
      return { tipo, ano, blocos: csvBlocos };
    }

    const texto = linhas.slice(1).join('\n');
    const blocos = splitIntoBlocks(texto);
    return { tipo, ano, blocos };
  }

  let texto: string;

  if (tipoMime === 'application/pdf') {
    texto = await parsePdf(caminho);
  } else {
    texto = fs.readFileSync(caminho, 'utf-8');
  }

  const blocos = splitIntoBlocks(texto);
  return { tipo, ano, blocos };
}
