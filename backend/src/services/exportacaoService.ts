import ExcelJS from 'exceljs';
import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import type { Turma, Aluno, ChamadaLog, Professor } from '../types';
import { parseDiasFromLabel, gerarDiasLetivos, formatMesAno, sortLabels } from '../utils/chamadaUtils';

const TENANT_LOCAL: Record<string, string> = {
  'bela-vista': 'Piscina Bela Vista',
  'sao-matheus': 'Piscina São Matheus',
  'vila': 'Piscina Vila',
  'parque': 'Piscina Parque',
  '3aidade': 'Piscina 3ª Idade',
};

function somarMinutos(horario: string, minutos: number): string {
  const [h, m] = horario.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hora = Math.floor(total / 60) % 24;
  const min = total % 60;
  return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const STATUS_MAP: Record<string, string> = {
  presente: 'p', falta: 'f', justificado: 'j',
  cancelado: 'C', feriado: '*', ponte: '*',
  reuniao: '*', evento: '*',
};

const EVENTO_NOME: Record<string, string> = {
  feriado: 'Feriado', ponte: 'Ponte', reuniao: 'Reunião',
  evento: 'Evento', ferias: 'Férias',
};

function formatStatusSugerido(status?: string, motivo?: string): string {
  if (!status) return '';
  if (status === 'AULA_NORMAL') return 'Aula NORMAL';
  const prefixo = status === 'AULA_CANCELADA' ? 'CANCELADA' : 'JUSTIFICADA';
  return motivo ? `${prefixo} — ${motivo}` : prefixo;
}

function capFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function gerarFrequenciaXLSX(
  tenantId: string,
  professorId: string,
  label: string | undefined,
  mes: number,
  ano: number,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fiz! App';
  workbook.created = new Date();

  const { data: professores, error: profError } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);
  if (profError) throw new AppError('Erro ao buscar professores', 500);
  const profMap = new Map((professores || []).map((p: any) => [p.id, p.nome]));

  console.log('[EXPORT] professorId=' + JSON.stringify(professorId) + ' tenantId=' + tenantId + ' label=' + label);

  let query = supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('professor_id', professorId);

  if (label) query = query.eq('label', label);

  const { data: turmas, error: turmasError } = await query.order('horario', { ascending: true });

  console.log('[EXPORT] turmas encontradas=' + (turmas ? turmas.length : 0));

  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);
  if (!turmas || turmas.length === 0) throw new AppError('Nenhuma turma encontrada', 404);

  const professorNome = profMap.get(professorId) || '---';

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('*')
    .eq('tenant_id', tenantId);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const labelsUnicas = sortLabels([...new Set(turmas.map((t: any) => t.label).filter(Boolean))]);

  const dataInicio = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2,'0')}-${String(ultimoDia).padStart(2,'0')}`;

  const { data: logs, error: logsError } = await supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (logsError) throw new AppError('Erro ao buscar chamadas', 500);

  const { data: anotacoes, error: anotacoesError } = await supabase
    .from('anotacoes_alunos')
    .select('*')
    .eq('tenant_id', tenantId);

  if (anotacoesError) throw new AppError('Erro ao buscar anotações', 500);

  const { data: eventos, error: eventosError } = await supabase
    .from('calendario')
    .select('data, tipo')
    .eq('tenant_id', tenantId)
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (eventosError) throw new AppError('Erro ao buscar eventos', 500);

  const { data: enrollments } = await supabase
    .from('enrollment_period')
    .select('aluno_id, turma_id, data_inicio, data_fim')
    .eq('tenant_id', tenantId);

  const enrollmentGrupos = new Map<string, Set<string>>();
  const alunoPeriodosPorData = new Map<string, Map<string, string>>(); // aluno_id -> (dataStr -> grupo_id)
  for (const ep of enrollments || []) {
    if (!ep.turma_id) continue;
    const inicio = ep.data_inicio;
    const fim = ep.data_fim || '9999-12-31';
    if (fim < dataInicio || inicio > dataFim) continue;
    if (!enrollmentGrupos.has(ep.aluno_id)) enrollmentGrupos.set(ep.aluno_id, new Set());
    enrollmentGrupos.get(ep.aluno_id)!.add(ep.turma_id);

    // Mapear cada dia do período para o grupo_id
    const dataIni = new Date(inicio + 'T12:00:00');
    const dataFimDt = new Date(fim + 'T12:00:00');
    for (let d = new Date(dataIni); d <= dataFimDt; d.setDate(d.getDate() + 1)) {
      const dataStr = d.toISOString().split('T')[0];
      if (!alunoPeriodosPorData.has(ep.aluno_id)) alunoPeriodosPorData.set(ep.aluno_id, new Map());
      alunoPeriodosPorData.get(ep.aluno_id)!.set(dataStr, ep.turma_id);
    }
  }

  let cardAulaMap = new Map<string, any>();
  const { data: cardAula, error: cardAulaError } = await supabase
    .from('card_aula')
    .select('data, temperatura_piscina, temperatura_externa, cloro_ppm, condicao_clima, sensacao, status_sugerido, motivo_sugerido')
    .eq('tenant_id', tenantId)
    .gte('data', dataInicio)
    .lte('data', dataFim);
  if (cardAulaError && !cardAulaError.message?.includes('relation') && !cardAulaError.message?.includes('does not exist')) {
    throw new AppError('Erro ao buscar card_aula', 500);
  }
  for (const ca of cardAula || []) {
    if (!cardAulaMap.has(ca.data) || (!cardAulaMap.get(ca.data).condicao_clima && ca.condicao_clima)) {
      cardAulaMap.set(ca.data, ca);
    }
  }

  const climaDoDia = (dataStr: string): any => {
    const ca = cardAulaMap.get(dataStr);
    if (ca) return ca;
    const log = (logs || []).find((l: ChamadaLog) => l.data === dataStr && l.condicao_clima != null);
    if (log) {
      const l = log as any;
      return {
        data: dataStr,
        temperatura_piscina: l.temperatura_piscina,
        temperatura_externa: l.temperatura_ext,
        cloro_ppm: l.cloro_ppm,
        condicao_clima: l.condicao_clima,
        sensacao: l.sensacao,
        status_sugerido: l.status_sugerido,
        motivo_sugerido: l.motivo_sugerido,
      };
    }
    return null;
  };

  const labelExtenso: Record<string, string> = {
    'Seg/Ter': 'Segunda e Terça', 'Seg/Qua': 'Segunda e Quarta', 'Seg/Qui': 'Segunda e Quinta',
    'Seg/Sex': 'Segunda e Sexta', 'Ter/Qua': 'Terça e Quarta', 'Ter/Qui': 'Terça e Quinta',
    'Ter/Sex': 'Terça e Sexta', 'Qua/Qui': 'Quarta e Quinta', 'Qua/Sex': 'Quarta e Sexta',
    'Qui/Sex': 'Quinta e Sexta', 'Seg': 'Segunda', 'Ter': 'Terça', 'Qua': 'Quarta',
    'Qui': 'Quinta', 'Sex': 'Sexta', 'Sab': 'Sábado',
    'Seg/Ter/Qua': 'Segunda, Terça e Quarta', 'Seg/Ter/Qui': 'Segunda, Terça e Quinta',
    'Seg/Qua/Sex': 'Segunda, Quarta e Sexta', 'Ter/Qua/Qui': 'Terça, Quarta e Quinta',
    'Ter/Qua/Sex': 'Terça, Quarta e Sexta', 'Qua/Qui/Sex': 'Quarta, Quinta e Sexta',
    'Seg/Ter/Qua/Qui': 'Segunda a Quinta', 'Seg a Sex': 'Segunda a Sexta',
  };

  for (const label of labelsUnicas) {
    const turmasLabel = turmas.filter((t: any) => t.label === label).sort((a: any, b: any) => a.horario.localeCompare(b.horario));
    const diasLetivos = gerarDiasLetivos(mes, ano, label);

    for (const turma of turmasLabel) {
      const grupoId = turma.grupo_id || turma.id;
      const ultimaColGrupo1 = 6 + diasLetivos.length;
      const alunosTurma = (alunos || []).filter((a: Aluno) => {
        if (a.turma_id === grupoId) return true;
        const historico = enrollmentGrupos.get(a.id);
        return historico?.has(grupoId) ?? false;
      });
      if (alunosTurma.length === 0) continue;

      const sheetName = `${label}-${turma.horario.slice(0, 5)}-${(turma.nivel || 'sem-nivel').replace(/\s+/g, '_')}`.replace(/[/\\?*\[\]:]/g, '-').slice(0, 31);
      const sheet = workbook.addWorksheet(sheetName, {
        pageSetup: { orientation: 'portrait', paperSize: 9, margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } },
      });

      const labelStyle: Partial<ExcelJS.Style> = { font: { size: 10 }, alignment: { horizontal: 'right', vertical: 'middle' } };
      const titleStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
      const dataStyle: Partial<ExcelJS.Style> = { font: { size: 9 }, alignment: { vertical: 'middle' } };
      const nameStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 9 }, alignment: { vertical: 'middle' } };
      const prefeituraStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 12 }, alignment: { horizontal: 'center', vertical: 'middle' } };

      const colWidths: Record<number, number> = { 1: 11.6, 2: 21.4, 3: 13.1, 4: 10, 5: 9.3 };
      for (let c = 6; c <= 5 + diasLetivos.length; c++) colWidths[c] = 3.4;
      colWidths[6 + diasLetivos.length] = 41.9;
      sheet.columns = Object.entries(colWidths).map(([idx, w]) => ({ key: `col${idx}`, width: w }));

      sheet.getRow(1).height = 15;
      sheet.getCell('A1').value = 'Modalidade:';
      sheet.getCell('A1').style = labelStyle;
      sheet.getCell('B1').value = 'Natação';
      sheet.getCell('B1').style = dataStyle;
      const mergeFim = colLetter(5 + diasLetivos.length);
      sheet.mergeCells(`D1:${mergeFim}1`);
      sheet.getCell('D1').value = 'PREFEITURA MUNICIPAL DE VINHEDO';
      sheet.getCell('D1').style = prefeituraStyle;

      sheet.getRow(2).height = 15;
      sheet.getCell('A2').value = 'Local:';
      sheet.getCell('A2').style = labelStyle;
      sheet.getCell('B2').value = TENANT_LOCAL[tenantId] || `Piscina ${tenantId}`;
      sheet.getCell('B2').style = dataStyle;
      sheet.mergeCells(`D2:${mergeFim}2`);
      sheet.getCell('D2').value = 'SECRETARIA DE ESPORTE E LAZER';
      sheet.getCell('D2').style = prefeituraStyle;

      sheet.getRow(3).height = 15;
      sheet.getCell('A3').value = 'Professor:';
      sheet.getCell('A3').style = labelStyle;
      sheet.getCell('B3').value = professorNome;
      sheet.getCell('B3').style = dataStyle;

      sheet.getRow(4).height = 15;
      sheet.getCell('A4').value = 'Turma:';
      sheet.getCell('A4').style = labelStyle;
      sheet.getCell('B4').value = labelExtenso[turma.label] || turma.label;
      sheet.getCell('B4').style = dataStyle;
      sheet.getCell('E4').value = 'Nível:';
      sheet.getCell('E4').style = labelStyle;
      sheet.getCell('F4').value = turma.nivel || '---';
      sheet.getCell('F4').style = dataStyle;

      sheet.getRow(5).height = 15;
      sheet.getCell('A5').value = 'Horário:';
      sheet.getCell('A5').style = labelStyle;
      const horarioFim = somarMinutos(turma.horario, turma.duracao_minutos || 45);
      sheet.getCell('B5').value = `${turma.horario.slice(0, 5)} - ${horarioFim}`;
      sheet.getCell('B5').style = dataStyle;
      sheet.getCell('E5').value = 'Mês:';
      sheet.getCell('E5').style = labelStyle;
      sheet.getCell('F5').value = formatMesAno(mes, ano);
      sheet.getCell('F5').style = dataStyle;

      const headerRow6 = sheet.getRow(6);
      headerRow6.height = 20;
      const gridHeaders: Array<[number, string]> = [[1, 'Nome'], [3, 'Whatsapp'], [4, 'parQ'], [5, 'Data Nasc.']];
      gridHeaders.forEach(([col, h]) => {
        const cell = headerRow6.getCell(col);
        cell.value = h;
        cell.style = titleStyle;
      });
      headerRow6.getCell(2).style = titleStyle;
      diasLetivos.forEach((dataStr, i) => {
        const col = 6 + i;
        const diaNum = parseInt(dataStr.split('-')[2], 10);
        const cell = headerRow6.getCell(col);
        cell.value = diaNum;
        cell.style = titleStyle;
      });
      const anotCell = headerRow6.getCell(6 + diasLetivos.length);
      anotCell.value = 'Anotações';
      anotCell.style = { font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }, alignment: { horizontal: 'center', vertical: 'middle' } };

      alunosTurma.sort((a: Aluno, b: Aluno) => a.nome.localeCompare(b.nome));
      alunosTurma.forEach((aluno: Aluno, idx: number) => {
        const rowNum = 7 + idx;
        const row = sheet.getRow(rowNum);
        row.height = 15;

        sheet.getCell(`A${rowNum}`).value = aluno.nome;
        sheet.getCell(`A${rowNum}`).style = nameStyle;

        sheet.getCell(`C${rowNum}`).value = aluno.contato || '';
        sheet.getCell(`C${rowNum}`).style = dataStyle;

        sheet.getCell(`D${rowNum}`).value = aluno.par_q ? 'Sim' : 'Não';
        sheet.getCell(`D${rowNum}`).style = dataStyle;

        const dn = aluno.data_nascimento ? new Date(aluno.data_nascimento + 'T12:00:00') : null;
        sheet.getCell(`E${rowNum}`).value = dn ? `${String(dn.getDate()).padStart(2,'0')}/${String(dn.getMonth()+1).padStart(2,'0')}/${dn.getFullYear()}` : '';
        sheet.getCell(`E${rowNum}`).style = dataStyle;

        diasLetivos.forEach((dataStr, di) => {
          const col = 6 + di;
          const cell = sheet.getCell(rowNum, col);
          cell.font = { size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Verificar se aluno estava neste grupo nesta data (via enrollment_period)
          const periodosAluno = alunoPeriodosPorData.get(aluno.id);
          const grupoValidoNaData = periodosAluno?.get(dataStr);
          const foraDoPeriodo = grupoValidoNaData && grupoValidoNaData !== grupoId;

          const evento = (eventos || []).find((e: any) => e.data === dataStr);
          if (evento) {
            cell.value = '*';
            cell.font = { size: 9, color: { argb: 'FF999999' } };
          } else if (foraDoPeriodo) {
            // Aluno não estava neste grupo neste dia - célula cinza/faded
            cell.value = '';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
            cell.font = { size: 9, color: { argb: 'FFCCCCCC' } };
          } else {
            const logsArr = logs || [];
            let log = logsArr.find((l: ChamadaLog) =>
              l.data === dataStr && l.grupo_id === aluno.id
            );
            if (!log) {
              log = logsArr.find((l: ChamadaLog) =>
                l.data === dataStr && l.grupo_id === aluno.turma_id
              );
            }
            if (log && log.status) {
              cell.value = STATUS_MAP[log.status] || '';
              if (cell.value === 'C') {
                cell.font = { size: 9, bold: true };
              } else if (cell.value === 'j') {
                cell.font = { size: 9, italic: true };
              } else if (cell.value === '*') {
                cell.font = { size: 9, color: { argb: 'FF999999' } };
              } else {
                cell.font = { size: 9 };
              }
            } else {
              cell.value = '';
            }
          }
        });

        const anotacoesMes = (anotacoes || []).filter((a: any) => {
          if (a.aluno_id !== aluno.id) return false;
          const d = new Date(a.criado_em);
          return !isNaN(d.getTime()) && d.getFullYear() === ano && d.getMonth() === mes - 1;
        }).map((a: any) => a.anotacao);

        const justifDedup = new Set<string>();
        const justifLinhas: string[] = [];
        const justifs = (logs || [])
          .filter((l: ChamadaLog) => l.status === 'justificado' && l.origem === 'manual' && (l.grupo_id === aluno.id || l.grupo_id === aluno.turma_id))
          .sort((a: ChamadaLog, b: ChamadaLog) => a.data.localeCompare(b.data));
        for (const j of justifs) {
          if (justifDedup.has(j.data)) continue;
          justifDedup.add(j.data);
          const dia = parseInt(j.data.slice(8, 10), 10);
          justifLinhas.push(j.motivo ? `${dia}-${j.motivo}` : `${dia}`);
        }

        const anotCol = sheet.getCell(rowNum, 6 + diasLetivos.length);
        anotCol.value = [...anotacoesMes, ...justifLinhas].join('|');
        anotCol.style = { font: { size: 8, italic: true }, alignment: { vertical: 'middle' } };
      });

      const blankRow = 7 + alunosTurma.length;
      const climaHeaderRow = blankRow + 1;
      const climaHeader = sheet.getRow(climaHeaderRow);
      climaHeader.height = 20;
      const climaHeaders: Array<[number, string]> = [
        [1, 'Dia'], [2, 'Piscina °C'], [3, 'Externa °C'], [4, 'Cloro ppm'],
        [6, 'Clima'], [11, 'Sensação'], [14, 'Status Sugerido'],
      ];
      climaHeaders.forEach(([col, h]) => {
        const cell = climaHeader.getCell(col);
        cell.value = h;
        cell.style = titleStyle;
      });
      for (let c = 1; c <= ultimaColGrupo1; c++) {
        climaHeader.getCell(c).style = titleStyle;
      }

      diasLetivos.forEach((dataStr, i) => {
        const rowNum = climaHeaderRow + 1 + i;
        const row = sheet.getRow(rowNum);
        row.height = 15;
        const clima = climaDoDia(dataStr);
        const evento = (eventos || []).find((e: any) => e.data === dataStr);

        const [y, m, d] = dataStr.split('-');
        const cellDia = sheet.getCell(rowNum, 1);
        cellDia.value = `${d}/${m}/${y.slice(2)}`;
        cellDia.font = { size: 9 };
        cellDia.alignment = { horizontal: 'center', vertical: 'middle' };

        const cellPisc = sheet.getCell(rowNum, 2);
        cellPisc.font = { size: 9 };
        cellPisc.alignment = { horizontal: 'center', vertical: 'middle' };
        cellPisc.value = clima?.temperatura_piscina != null
          ? (clima.temperatura_piscina < 25 ? `${clima.temperatura_piscina.toFixed(1)} ❄` : clima.temperatura_piscina.toFixed(1))
          : '—';

        const cellExt = sheet.getCell(rowNum, 3);
        cellExt.font = { size: 9 };
        cellExt.alignment = { horizontal: 'center', vertical: 'middle' };
        cellExt.value = clima?.temperatura_externa != null ? clima.temperatura_externa.toFixed(1) : '—';

        const cellCloro = sheet.getCell(rowNum, 4);
        cellCloro.font = { size: 9 };
        cellCloro.alignment = { horizontal: 'center', vertical: 'middle' };
        cellCloro.value = clima?.cloro_ppm != null ? clima.cloro_ppm.toFixed(1) : '—';

        const cellClima = sheet.getCell(rowNum, 6);
        cellClima.font = { size: 9 };
        cellClima.alignment = { horizontal: 'center', vertical: 'middle' };
        cellClima.value = clima?.condicao_clima ? capFirst(clima.condicao_clima) : '—';

        const cellSens = sheet.getCell(rowNum, 11);
        cellSens.font = { size: 9 };
        cellSens.alignment = { horizontal: 'center', vertical: 'middle' };
        const sensacoes: string[] = clima?.sensacao || [];
        cellSens.value = sensacoes.length > 0 ? sensacoes.join(' + ') : '—';

        const cellStatus = sheet.getCell(rowNum, 14);
        cellStatus.font = { size: 9 };
        cellStatus.alignment = { horizontal: 'left', vertical: 'middle' };
        cellStatus.value = evento
          ? (EVENTO_NOME[evento.tipo] || capFirst(evento.tipo))
          : formatStatusSugerido(clima?.status_sugerido, clima?.motivo_sugerido);
      });

      const legendRow = climaHeaderRow + 1 + diasLetivos.length;
      const cellLegend = sheet.getCell(legendRow, 1);
      cellLegend.value = '❄ = água < 25°C (água muito fria)';
      cellLegend.font = { size: 9 };
      cellLegend.alignment = { horizontal: 'left', vertical: 'middle' };

      const obsHeaderRow = legendRow + 2;
      const obsHeaderStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }, alignment: { horizontal: 'left', vertical: 'middle' } };
      const obsHeader = sheet.getCell(obsHeaderRow, 1);
      obsHeader.value = 'Observações';
      obsHeader.style = obsHeaderStyle;
      for (let c = 2; c <= ultimaColGrupo1; c++) {
        sheet.getCell(obsHeaderRow, c).style = obsHeaderStyle;
      }
      for (let i = 0; i < 5; i++) {
        sheet.getRow(obsHeaderRow + 1 + i).height = 15;
        sheet.getCell(obsHeaderRow + 1 + i, 1).border = { top: { style: 'thin', color: { argb: 'FFD9D9D9' } }, bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } } };
      }
    }
  }

  return workbook.xlsx.writeBuffer();
}

export async function gerarCancelamentosXLSX(
  tenantId: string,
  ano: number,
  tipoSelect: string | undefined,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fiz! App';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Cancelamentos', {
    views: [{ state: 'normal', zoomScale: 90 }],
  });

  const { data: professores } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);
  const profMap = new Map((professores || []).map((p: any) => [p.id, p.nome]));

  const { data: turmas } = await supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('horario', { ascending: true });
  if (!turmas || turmas.length === 0) throw new AppError('Nenhuma turma encontrada', 404);

  const turmaMap = new Map<string, any>();
  for (const t of turmas) {
    turmaMap.set(t.grupo_id || t.id, t);
  }

  const dataInicio = `${ano}-01-01`;
  const dataFim = `${ano}-12-31`;

  let logsQuery = supabase
    .from('chamadas_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'cancelado')
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (tipoSelect && tipoSelect !== 'todos') {
    logsQuery = logsQuery.eq('tipo_select', tipoSelect);
  }

  const { data: logs } = await logsQuery.order('data', { ascending: true });

  if (!logs || logs.length === 0) throw new AppError('Nenhum cancelamento encontrado no período', 404);

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  const dataStyle: Partial<ExcelJS.Style> = {
    font: { size: 10 },
    alignment: { vertical: 'middle' },
  };

  const columns = [
    { header: 'Data', width: 14 },
    { header: 'Motivo', width: 30 },
    { header: 'Horário', width: 10 },
    { header: 'Turma', width: 14 },
    { header: 'Nível', width: 16 },
    { header: 'Professor', width: 20 },
    { header: 'Tipo', width: 12 },
  ];
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 20;
  columns.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = columns[i].header;
    cell.style = headerStyle;
  });

  logs.forEach((log: any, idx: number) => {
    const rowNum = 2 + idx;
    const row = sheet.getRow(rowNum);
    row.height = 16;

    const turma = turmaMap.get(log.grupo_id);
    const profNome = turma ? profMap.get(turma.professor_id) || '---' : '---';
    const [y, m, d] = log.data.split('-');
    const dataPtBr = `${d}/${m}/${y}`;

    sheet.getCell(`A${rowNum}`).value = dataPtBr;
    sheet.getCell(`A${rowNum}`).style = dataStyle;
    sheet.getCell(`B${rowNum}`).value = log.motivo || log.tipo_ocorrencia || '---';
    sheet.getCell(`B${rowNum}`).style = dataStyle;
    sheet.getCell(`C${rowNum}`).value = turma?.horario?.slice(0, 5) || '---';
    sheet.getCell(`C${rowNum}`).style = dataStyle;
    sheet.getCell(`D${rowNum}`).value = turma?.label || log.grupo_id || '---';
    sheet.getCell(`D${rowNum}`).style = dataStyle;
    sheet.getCell(`E${rowNum}`).value = turma?.nivel || '---';
    sheet.getCell(`E${rowNum}`).style = dataStyle;
    sheet.getCell(`F${rowNum}`).value = profNome;
    sheet.getCell(`F${rowNum}`).style = dataStyle;
    sheet.getCell(`G${rowNum}`).value = log.tipo_select === 'pessoal' ? 'Pessoal' : log.tipo_select === 'geral' ? 'Geral' : '---';
    sheet.getCell(`G${rowNum}`).style = dataStyle;
  });

  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  return workbook.xlsx.writeBuffer();
}

export async function gerarVagasXLSX(tenantId: string): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fiz! App';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Planilha1', {
    views: [{ state: 'normal', zoomScale: 90 }],
  });

  const { data: professores, error: profError } = await supabase
    .from('professores')
    .select('id, nome')
    .eq('tenant_id', tenantId);
  if (profError) throw new AppError('Erro ao buscar professores', 500);
  const profMap = new Map((professores || []).map((p: any) => [p.id, p.nome]));

  const { data: turmas, error: turmasError } = await supabase
    .from('turmas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('horario', { ascending: true });

  if (turmasError) throw new AppError('Erro ao buscar turmas', 500);

  const { data: alunos, error: alunosError } = await supabase
    .from('alunos')
    .select('turma_id')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (alunosError) throw new AppError('Erro ao buscar alunos', 500);

  const ocupacao: Record<string, number> = {};
  alunos?.forEach((a: any) => {
    if (a.turma_id) ocupacao[a.turma_id] = (ocupacao[a.turma_id] || 0) + 1;
  });

  const gruposPorLabelHorario: Record<string, Record<string, any[]>> = {};
  for (const t of turmas || []) {
    const labelKey = t.label || 'sem-label';
    if (!gruposPorLabelHorario[labelKey]) gruposPorLabelHorario[labelKey] = {};
    const horKey = (t.horario || '00:00').slice(0, 5);
    if (!gruposPorLabelHorario[labelKey][horKey]) gruposPorLabelHorario[labelKey][horKey] = [];
    gruposPorLabelHorario[labelKey][horKey].push(t);
  }

  const agora = new Date();
  const ts = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()}, ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}:${String(agora.getSeconds()).padStart(2,'0')}`;

  const labelStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 10 } };
  const dataStyle: Partial<ExcelJS.Style> = { font: { size: 10, color: { argb: 'FF333333' } }, alignment: { vertical: 'middle' } };
  const numberStyle: Partial<ExcelJS.Style> = { font: { size: 10 }, alignment: { horizontal: 'center', vertical: 'middle' } };
  const totStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 10, color: { argb: 'FF1F4E79' } } };
  const vagasStyle: Partial<ExcelJS.Style> = { font: { size: 10, color: { argb: 'FF006600' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
  const excessoStyle: Partial<ExcelJS.Style> = { font: { size: 10, color: { argb: 'FFCC0000' } }, alignment: { horizontal: 'center', vertical: 'middle' } };

  const colWidths = [10.7, 6.3, 8.7, 2, 2.4, 10.7, 6.3, 8.7, 2, 2.4, 10.7, 6.3, 8.7, 2];
  const colKeys = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];

  sheet.columns = colWidths.map((w, i) => ({ key: `col${i}`, width: w }));

  let currentRow = 1;

  const titleCell = sheet.getCell(`A${currentRow}`);
  titleCell.value = 'Relatório de Vagas';
  titleCell.style = { font: { bold: true, size: 14 }, alignment: { horizontal: 'left', vertical: 'middle' } };
  currentRow++;

  sheet.getCell(`A${currentRow}`).value = `Gerado em ${ts}`;
  sheet.getCell(`A${currentRow}`).style = { font: { size: 9, italic: true, color: { argb: 'FF666666' } } };
  currentRow++;

  let totalCap = 0, totalAtivos = 0;
  Object.values(gruposPorLabelHorario).forEach((horMap: any) => {
    Object.values(horMap).forEach((turmasArr: any) => {
      turmasArr.forEach((t: any) => {
        const cap = t.capacidade || 0;
        const ocup = ocupacao[t.grupo_id || t.id] || 0;
        totalCap += cap;
        totalAtivos += ocup;
      });
    });
  });
  const totalVagas = Math.max(0, totalCap - totalAtivos);
  const totalExcesso = Math.max(0, totalAtivos - totalCap);
  sheet.getCell(`A${currentRow}`).value = `Totais: Lotação ${totalAtivos}/${totalCap} | Vagas ${totalVagas} | Excesso ${totalExcesso}`;
  sheet.getCell(`A${currentRow}`).style = totStyle;
  currentRow++;
  currentRow++;

  const labels = sortLabels(Object.keys(gruposPorLabelHorario));
  for (const label of labels) {
    const horarios = Object.keys(gruposPorLabelHorario[label]).sort();
    const horariosComTurmas = horarios.map((h) => ({ horario: h, turmas: gruposPorLabelHorario[label][h] }));

    for (let bloco = 0; bloco < horariosComTurmas.length; bloco += 3) {
      const chunk = horariosComTurmas.slice(bloco, bloco + 3);

      chunk.forEach((item: any, ci: number) => {
        const colBase = ci * 5;
        const cFn = (idx: number) => colKeys[colBase + idx] || '';
        sheet.getCell(`${cFn(0)}${currentRow}`).value = item.horario.slice(0, 5);
        sheet.getCell(`${cFn(0)}${currentRow}`).style = labelStyle;
        sheet.getCell(`${cFn(1)}${currentRow}`).value = label;
        sheet.getCell(`${cFn(1)}${currentRow}`).style = labelStyle;
      });
      currentRow++;

      const maxRows = Math.max(...chunk.map((item: any) => item.turmas.length));

      for (let ri = 0; ri < maxRows; ri++) {
        chunk.forEach((item: any, ci: number) => {
          const colBase = ci * 5;
          const cFn = (idx: number) => colKeys[colBase + idx] || '';
          const t = item.turmas[ri];
          if (t) {
            const cap = t.capacidade || 0;
            const ocup = ocupacao[t.grupo_id || t.id] || 0;
            const profNome = profMap.get(t.professor_id) || '---';
            sheet.getCell(`${cFn(0)}${currentRow}`).value = `${t.nivel || '---'}:`;
            sheet.getCell(`${cFn(0)}${currentRow}`).style = dataStyle;
            sheet.getCell(`${cFn(1)}${currentRow}`).value = `${ocup}/${cap}`;
            sheet.getCell(`${cFn(1)}${currentRow}`).style = numberStyle;
            sheet.getCell(`${cFn(2)}${currentRow}`).value = profNome;
            sheet.getCell(`${cFn(2)}${currentRow}`).style = { font: { size: 9, color: { argb: 'FF666666' } } };
          }
        });
        currentRow++;
      }

      chunk.forEach((item: any, ci: number) => {
        const colBase = ci * 5;
        const cFn = (idx: number) => colKeys[colBase + idx] || '';
        const capTotal = item.turmas.reduce((s: number, t: any) => s + (t.capacidade || 0), 0);
        const ocupTotal = item.turmas.reduce((s: number, t: any) => s + (ocupacao[t.grupo_id || t.id] || 0), 0);

        sheet.getCell(`${cFn(0)}${currentRow}`).value = 'Lotação:';
        sheet.getCell(`${cFn(0)}${currentRow}`).style = { font: { bold: true, size: 10, color: { argb: 'FF1F4E79' } } };
        sheet.getCell(`${cFn(1)}${currentRow}`).value = `${ocupTotal}/${capTotal}`;
        sheet.getCell(`${cFn(1)}${currentRow}`).style = numberStyle;
      });
      currentRow++;

      chunk.forEach((item: any, ci: number) => {
        const colBase = ci * 5;
        const cFn = (idx: number) => colKeys[colBase + idx] || '';
        const capTotal = item.turmas.reduce((s: number, t: any) => s + (t.capacidade || 0), 0);
        const ocupTotal = item.turmas.reduce((s: number, t: any) => s + (ocupacao[t.grupo_id || t.id] || 0), 0);
        const vagasTotal = Math.max(0, capTotal - ocupTotal);
        const excessoTotal = Math.max(0, ocupTotal - capTotal);

        sheet.getCell(`${cFn(0)}${currentRow}`).value = 'Vagas:';
        sheet.getCell(`${cFn(0)}${currentRow}`).style = { font: { size: 10, color: { argb: 'FF006600' } } };
        sheet.getCell(`${cFn(1)}${currentRow}`).value = vagasTotal;
        sheet.getCell(`${cFn(1)}${currentRow}`).style = vagasStyle;
        sheet.getCell(`${cFn(2)}${currentRow}`).value = 'Excesso:';
        sheet.getCell(`${cFn(2)}${currentRow}`).style = { font: { size: 10, color: { argb: 'FFCC0000' } } };
        sheet.getCell(`${cFn(3)}${currentRow}`).value = excessoTotal;
        sheet.getCell(`${cFn(3)}${currentRow}`).style = excessoStyle;
      });
      currentRow++;
      currentRow++;
    }
  }

  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };

  return workbook.xlsx.writeBuffer();
}
