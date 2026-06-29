export function formatarNomeMobile(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length <= 2) return nomeCompleto.trim();

  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  const penultimo = partes[partes.length - 2];
  const preposicoes = ['de', 'da', 'do', 'das', 'dos'];

  if (preposicoes.includes(penultimo.toLowerCase())) {
    return `${primeiro} ${penultimo} ${ultimo}`;
  }

  return `${primeiro} ${ultimo}`;
}

export function calcIdade(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mesDiff = hoje.getMonth() - nasc.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

export function calcCategoria(idade: number): string {
  if (idade < 3) return 'Baby';
  if (idade <= 5) return 'Infantil A';
  if (idade <= 7) return 'Infantil B';
  if (idade <= 9) return 'Infantil C';
  if (idade <= 11) return 'Juvenil A';
  if (idade <= 13) return 'Juvenil B';
  if (idade <= 17) return 'Juvenil C';
  if (idade <= 29) return 'Adulto';
  if (idade <= 49) return 'Master';
  return 'Sênior';
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
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
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
