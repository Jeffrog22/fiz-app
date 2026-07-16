import type { Turma } from '../types';

export function formatarNomeMobile(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length <= 2) return nomeCompleto.trim();

  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  const penultimo = partes[partes.length - 2];
  const preposicoes = ['de', 'da', 'do', 'das', 'dos'];

  if (preposicoes.includes(penultimo.toLowerCase())) {
    if (partes.length > 4) {
      const segundo = partes[1];
      return `${primeiro} ${segundo} ${penultimo} ${ultimo}`;
    }
    return `${primeiro} ${penultimo} ${ultimo}`;
  }

  return `${primeiro} ${ultimo}`;
}

export function calcIdade(dataNascimento?: string): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento + 'T12:00:00');
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

export function calcCategoria(idade: number | null): string {
  if (idade === null || idade < 0) return '';
  if (idade < 9) return 'Pré-Mirim';
  if (idade < 10) return 'Mirim I';
  if (idade < 11) return 'Mirim II';
  if (idade < 12) return 'Petiz I';
  if (idade < 13) return 'Petiz II';
  if (idade < 14) return 'Infantil I';
  if (idade < 15) return 'Infantil II';
  if (idade < 16) return 'Juvenil I';
  if (idade < 17) return 'Juvenil II';
  if (idade < 18) return 'Júnior I';
  if (idade < 20) return 'Júnior II/Sênior';
  if (idade < 25) return 'A20+';
  if (idade < 30) return 'B25+';
  if (idade < 35) return 'C30+';
  if (idade < 40) return 'D35+';
  if (idade < 45) return 'E40+';
  if (idade < 50) return 'F45+';
  if (idade < 55) return 'G50+';
  if (idade < 60) return 'H55+';
  if (idade < 65) return 'I60+';
  if (idade < 70) return 'J65+';
  if (idade < 75) return 'K70+';
  if (idade < 80) return 'L75+';
  return 'M80+';
}

export function mascaraData(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function mascaraHora(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

export function mascaraTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function desmascarar(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatDateBR(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatTime(s: string | null | undefined): string {
  if (!s) return '-';
  return s.length >= 5 ? s.substring(0, 5) : s;
}

export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function formatDateISO(brDate: string): string {
  const partes = brDate.split('/');
  if (partes.length !== 3) return brDate;
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

export function getWeatherIcon(code: number): string {
  if (code === 0) return '\u2600\uFE0F';
  if (code === 1) return '\uD83C\uDF24\uFE0F';
  if (code === 2) return '\u26C5';
  if (code === 3) return '\u2601\uFE0F';
  if (code >= 45 && code <= 48) return '\uD83C\uDF2B\uFE0F';
  if (code >= 51 && code <= 67) return '\uD83C\uDF27\uFE0F';
  if (code >= 71 && code <= 77) return '\u2744\uFE0F';
  if (code >= 80 && code <= 82) return '\uD83C\uDF26\uFE0F';
  if (code >= 85 && code <= 86) return '\u2744\uFE0F';
  if (code >= 95) return '\u26A1';
  return '\u2601\uFE0F';
}

const DAY_ORDER: Record<string, number> = {
  Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sab: 6,
};

export function sortTurmas(turmas: Turma[]): Turma[] {
  return [...turmas].sort((a, b) => {
    const aDay = DAY_ORDER[a.label.split('/')[0]] ?? 99;
    const bDay = DAY_ORDER[b.label.split('/')[0]] ?? 99;
    if (aDay !== bDay) return aDay - bDay;
    return a.horario.localeCompare(b.horario);
  });
}
