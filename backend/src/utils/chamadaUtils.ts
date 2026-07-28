const ABREV_MAP: Record<string, number> = {
  Dom: 0, dom: 0, Seg: 1, seg: 1, Ter: 2, ter: 2,
  Qua: 3, qua: 3, Qui: 4, qui: 4, Sex: 5, sex: 5, Sab: 6, sab: 6,
};

export function parseDiasFromLabel(label: string): number[] {
  if (!label) return [];
  const dias: number[] = [];
  for (const parte of label.split('/')) {
    const idx = ABREV_MAP[parte.trim()];
    if (idx !== undefined) dias.push(idx);
  }
  return [...new Set(dias)];
}

export function gerarDiasLetivos(mes: number, ano: number, label: string): string[] {
  const diasSemana = parseDiasFromLabel(label);
  if (diasSemana.length === 0) return [];
  const dates: string[] = [];
  const ultimoDia = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= ultimoDia; d++) {
    const diaSemana = new Date(ano, mes - 1, d).getDay();
    if (diasSemana.includes(diaSemana)) {
      dates.push(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }
  return dates;
}

export function formatMesAno(mes: number, ano: number): string {
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${meses[mes - 1]}/${ano}`;
}

export const LABEL_ORDER: Record<string, number> = {
  'Seg': 1, 'Seg/Ter': 2, 'Seg/Qua': 3, 'Seg/Qui': 4, 'Seg/Sex': 5,
  'Ter': 6, 'Ter/Qua': 7, 'Ter/Qui': 8, 'Ter/Sex': 9,
  'Qua': 10, 'Qua/Qui': 11, 'Qua/Sex': 12,
  'Qui': 13, 'Qui/Sex': 14,
  'Sex': 15, 'Sab': 16,
  'Seg/Ter/Qua': 20, 'Seg/Ter/Qui': 21, 'Seg/Qua/Sex': 22,
  'Ter/Qua/Qui': 23, 'Ter/Qua/Sex': 24, 'Qua/Qui/Sex': 25,
  'Seg/Ter/Qua/Qui': 30, 'Seg a Sex': 31,
};

export function sortLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => (LABEL_ORDER[a] || 99) - (LABEL_ORDER[b] || 99));
}
