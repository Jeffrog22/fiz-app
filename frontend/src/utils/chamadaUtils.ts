const ABREV_MAP: Record<string, number> = {
  'Dom': 0, 'dom': 0,
  'Seg': 1, 'seg': 1,
  'Ter': 2, 'ter': 2,
  'Qua': 3, 'qua': 3,
  'Qui': 4, 'qui': 4,
  'Sex': 5, 'sex': 5,
  'Sab': 6, 'sab': 6,
};

function parseDiasFromLabel(label: string): number[] {
  if (!label) return [];
  const dias: number[] = [];
  for (const parte of label.split('/')) {
    const trimmed = parte.trim();
    const idx = ABREV_MAP[trimmed];
    if (idx !== undefined) dias.push(idx);
  }
  return [...new Set(dias)];
}

export function gerarDiasLetivos(mes: number, ano: number, labelTurma: string): string[] {
  const diasSemana = parseDiasFromLabel(labelTurma);
  if (diasSemana.length === 0) return [];

  const dates: string[] = [];
  const ultimoDia = new Date(ano, mes, 0).getDate();

  for (let d = 1; d <= ultimoDia; d++) {
    const diaSemana = new Date(ano, mes - 1, d).getDay();
    if (diasSemana.includes(diaSemana)) {
      const mesStr = String(mes).padStart(2, '0');
      const diaStr = String(d).padStart(2, '0');
      dates.push(`${ano}-${mesStr}-${diaStr}`);
    }
  }

  return dates;
}

export function formatMesAno(mes: number, ano: number): string {
  const meses = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];
  return `${meses[mes - 1]}/${ano}`;
}

export function parseMesAno(str: string): { mes: number; ano: number } | null {
  const partes = str.split('/');
  if (partes.length !== 2) return null;
  const meses: Record<string, number> = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  };
  const mes = meses[partes[0].toLowerCase()];
  const ano = parseInt(partes[1], 10);
  if (!mes || isNaN(ano)) return null;
  return { mes, ano };
}

export function hojeMesAno(): { mes: number; ano: number } {
  const hoje = new Date();
  return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
}

export function isDataFutura(data: string): boolean {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  return new Date(data + 'T23:59:59') > hoje;
}

export function isDataPassada(data: string): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return new Date(data + 'T00:00:00') < hoje;
}
