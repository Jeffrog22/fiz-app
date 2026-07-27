import ExcelJS from 'exceljs';
import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';
import type { Turma, Aluno, ChamadaLog, Professor } from '../types';

const ABREV_MAP: Record<string, number> = {
  Dom: 0, dom: 0, Seg: 1, seg: 1, Ter: 2, ter: 2,
  Qua: 3, qua: 3, Qui: 4, qui: 4, Sex: 5, sex: 5, Sab: 6, sab: 6,
};

function parseDiasFromLabel(label: string): number[] {
  if (!label) return [];
  const dias: number[] = [];
  for (const parte of label.split('/')) {
    const idx = ABREV_MAP[parte.trim()];
    if (idx !== undefined) dias.push(idx);
  }
  return [...new Set(dias)];
}

function gerarDiasLetivos(mes: number, ano: number, label: string): string[] {
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

const STATUS_MAP: Record<string, string> = {
  presente: 'p', falta: 'f', justificado: 'j',
  cancelado: 'C', feriado: '*', ponte: '*',
  reuniao: '*', evento: '*',
};

function formatMesAno(mes: number, ano: number): string {
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${meses[mes - 1]}/${ano}`;
}

const LABEL_ORDER: Record<string, number> = {
  'Seg': 1, 'Seg/Ter': 2, 'Seg/Qua': 3, 'Seg/Qui': 4, 'Seg/Sex': 5,
  'Ter': 6, 'Ter/Qua': 7, 'Ter/Qui': 8, 'Ter/Sex': 9,
  'Qua': 10, 'Qua/Qui': 11, 'Qua/Sex': 12,
  'Qui': 13, 'Qui/Sex': 14,
  'Sex': 15, 'Sab': 16,
  'Seg/Ter/Qua': 20, 'Seg/Ter/Qui': 21, 'Seg/Qua/Sex': 22,
  'Ter/Qua/Qui': 23, 'Ter/Qua/Sex': 24, 'Qua/Qui/Sex': 25,
  'Seg/Ter/Qua/Qui': 30, 'Seg a Sex': 31,
};

function sortLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => (LABEL_ORDER[a] || 99) - (LABEL_ORDER[b] || 99));
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
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

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
      const alunosTurma = (alunos || []).filter((a: Aluno) => a.turma_id === grupoId && a.ativo);
      if (alunosTurma.length === 0) continue;

      const sheetName = `${label}-${turma.horario.slice(0, 5)}-${(turma.nivel || 'sem-nivel').replace(/\s+/g, '_')}`.replace(/[/\\?*\[\]:]/g, '-').slice(0, 31);
      const sheet = workbook.addWorksheet(sheetName, {
        pageSetup: { orientation: 'portrait', paperSize: 9, margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } },
      });

      const headerStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 10 }, alignment: { vertical: 'middle' } };
      const titleStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } };
      const dataStyle: Partial<ExcelJS.Style> = { font: { size: 9 }, alignment: { vertical: 'middle' } };
      const nameStyle: Partial<ExcelJS.Style> = { font: { bold: true, size: 9 }, alignment: { vertical: 'middle' } };

      const colWidths: Record<number, number> = { 1: 36, 2: 20, 3: 11, 4: 13 };
      for (let c = 5; c <= 4 + diasLetivos.length; c++) colWidths[c] = 3.5;
      colWidths[5 + diasLetivos.length] = 40;
      sheet.columns = Object.entries(colWidths).map(([idx, w]) => ({ key: `col${idx}`, width: w }));

      sheet.getRow(1).height = 15;
      sheet.getCell('A1').value = 'Modalidade:';
      sheet.getCell('A1').style = headerStyle;
      sheet.getCell('B1').value = 'Natação';
      sheet.getCell('B1').style = dataStyle;
      sheet.mergeCells('D1:K1');
      sheet.getCell('D1').value = 'PREFEITURA MUNICIPAL DE VINHEDO';
      sheet.getCell('D1').style = { font: { bold: true, size: 10 }, alignment: { horizontal: 'center', vertical: 'middle' } };

      sheet.getRow(2).height = 15;
      sheet.getCell('A2').value = 'Local:';
      sheet.getCell('A2').style = headerStyle;
      sheet.getCell('B2').value = 'Piscina Bela Vista';
      sheet.getCell('B2').style = dataStyle;
      sheet.mergeCells('D2:K2');
      sheet.getCell('D2').value = 'SECRETARIA DE ESPORTE E LAZER';
      sheet.getCell('D2').style = { font: { bold: true, size: 10 }, alignment: { horizontal: 'center', vertical: 'middle' } };

      sheet.getRow(3).height = 15;
      sheet.getCell('A3').value = 'Professor:';
      sheet.getCell('A3').style = headerStyle;
      sheet.getCell('B3').value = professorNome;
      sheet.getCell('B3').style = dataStyle;

      sheet.getRow(4).height = 15;
      sheet.getCell('A4').value = 'Turma:';
      sheet.getCell('A4').style = headerStyle;
      sheet.getCell('B4').value = labelExtenso[turma.label] || turma.label;
      sheet.getCell('B4').style = dataStyle;
      sheet.getCell('D4').value = 'Nível:';
      sheet.getCell('D4').style = headerStyle;
      sheet.getCell('E4').value = turma.nivel || '---';
      sheet.getCell('E4').style = dataStyle;

      sheet.getRow(5).height = 15;
      sheet.getCell('A5').value = 'Horário:';
      sheet.getCell('A5').style = headerStyle;
      sheet.getCell('B5').value = turma.horario.slice(0, 5);
      sheet.getCell('B5').style = dataStyle;
      sheet.getCell('D5').value = 'Mês:';
      sheet.getCell('D5').style = headerStyle;
      sheet.getCell('E5').value = formatMesAno(mes, ano);
      sheet.getCell('E5').style = dataStyle;

      const headerRow6 = sheet.getRow(6);
      headerRow6.height = 20;
      const headers = ['Nome', 'Whatsapp', 'parQ', 'Aniversário'];
      headers.forEach((h, i) => {
        const cell = headerRow6.getCell(i + 1);
        cell.value = h;
        cell.style = i === 0 ? { ...titleStyle, font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } } } : titleStyle;
      });
      diasLetivos.forEach((dataStr, i) => {
        const col = 5 + i;
        const diaNum = parseInt(dataStr.split('-')[2], 10);
        const cell = headerRow6.getCell(col);
        cell.value = diaNum;
        cell.style = titleStyle;
      });
      const anotCell = headerRow6.getCell(5 + diasLetivos.length);
      anotCell.value = 'Anotações';
      anotCell.style = { font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } };

      alunosTurma.sort((a: Aluno, b: Aluno) => a.nome.localeCompare(b.nome));
      alunosTurma.forEach((aluno: Aluno, idx: number) => {
        const rowNum = 7 + idx;
        const row = sheet.getRow(rowNum);
        row.height = 15;

        sheet.getCell(`A${rowNum}`).value = aluno.nome;
        sheet.getCell(`A${rowNum}`).style = nameStyle;

        sheet.getCell(`B${rowNum}`).value = aluno.contato || '';
        sheet.getCell(`B${rowNum}`).style = dataStyle;

        sheet.getCell(`C${rowNum}`).value = aluno.par_q ? 'Sim' : 'Não';
        sheet.getCell(`C${rowNum}`).style = dataStyle;

        const dn = aluno.data_nascimento ? new Date(aluno.data_nascimento + 'T12:00:00') : null;
        sheet.getCell(`D${rowNum}`).value = dn ? `${String(dn.getDate()).padStart(2,'0')}/${String(dn.getMonth()+1).padStart(2,'0')}/${dn.getFullYear()}` : '';
        sheet.getCell(`D${rowNum}`).style = dataStyle;

        diasLetivos.forEach((dataStr, di) => {
          const col = 5 + di;
          const log = (logs || []).find((l: ChamadaLog) =>
            l.data === dataStr && l.grupo_id === aluno.turma_id
          );
          const cell = sheet.getCell(rowNum, col);
          if (log && log.status) {
            cell.value = STATUS_MAP[log.status] || '';
            if (cell.value === 'C') {
              cell.style = { font: { size: 9, color: { argb: 'FFFF0000' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
            } else if (cell.value === 'j') {
              cell.style = { font: { size: 9, color: { argb: 'FFFF8C00' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
            } else if (cell.value === 'f') {
              cell.style = { font: { size: 9, color: { argb: 'FF808080' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
            } else {
              cell.style = { font: { size: 9 }, alignment: { horizontal: 'center', vertical: 'middle' } };
            }
          } else {
            cell.value = '';
            cell.style = { font: { size: 9 }, alignment: { horizontal: 'center', vertical: 'middle' } };
          }
        });

        const anotacao = (anotacoes || []).find((a: any) => a.aluno_id === aluno.id);
        const anotCol = sheet.getCell(rowNum, 5 + diasLetivos.length);
        anotCol.value = anotacao?.anotacao || '';
        anotCol.style = { font: { size: 8, italic: true }, alignment: { vertical: 'middle', wrapText: true } };
      });
    }
  }

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
