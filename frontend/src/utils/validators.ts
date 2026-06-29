export function validarNome(value: string): string | null {
  if (!value || !value.trim()) return 'Preencha o nome do professor';
  if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
  return null;
}

export function validarCSV(file: File | null): string | null {
  if (!file) return null;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'csv') return 'Arquivo inválido. Use o template oficial (.csv).';
  if (file.size === 0) return 'Arquivo vazio.';
  if (file.size > 5 * 1024 * 1024) return 'Arquivo muito grande. Máximo 5MB.';
  return null;
}

export function validarData(value: string): string | null {
  const masked = value.replace(/\D/g, '');
  if (masked.length !== 8) return 'Data deve ter 8 dígitos (dd/mm/aaaa)';
  const dia = parseInt(masked.slice(0, 2), 10);
  const mes = parseInt(masked.slice(2, 4), 10);
  const ano = parseInt(masked.slice(4, 8), 10);
  if (mes < 1 || mes > 12) return 'Mês inválido';
  if (dia < 1 || dia > 31) return 'Dia inválido';
  if (ano < 1900 || ano > 2100) return 'Ano inválido';
  return null;
}

export function validarHora(value: string): string | null {
  const masked = value.replace(/\D/g, '');
  if (masked.length !== 4) return 'Horário deve ter 4 dígitos (0000)';
  const hora = parseInt(masked.slice(0, 2), 10);
  const min = parseInt(masked.slice(2, 4), 10);
  if (hora < 0 || hora > 23) return 'Hora inválida (00-23)';
  if (min < 0 || min > 59) return 'Minuto inválido (00-59)';
  return null;
}

export function validarTelefone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length < 10 || digits.length > 11) return 'Telefone deve ter 10 ou 11 dígitos';
  return null;
}

export function sanitizarInput(value: string): string {
  return value.replace(/[<>&"']/g, '').trim();
}
