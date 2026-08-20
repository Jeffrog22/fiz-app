export function calcularCategoria(dataNascimento?: string): string | undefined {
  if (!dataNascimento) return undefined;
  const nasc = new Date(dataNascimento + 'T12:00:00');
  const idade = new Date().getFullYear() - nasc.getFullYear();

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