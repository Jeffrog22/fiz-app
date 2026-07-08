import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function gerarTemplate() {
  const templatesDir = path.resolve(__dirname, '../src/templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fiz! App';
  workbook.created = new Date();

  /* ───── Sheet: Dashboard ───── */
  const dash = workbook.addWorksheet('Dashboard');
  dash.mergeCells('A1:F1');
  const titleCell = dash.getCell('A1');
  titleCell.value = 'RELATORIO DE CANCELAMENTOS';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  dash.getRow(1).height = 30;

  dash.getCell('A3').value = 'Total Cancelamentos:';
  dash.getCell('A3').font = { bold: true };
  dash.getCell('B3').value = 0;
  dash.getCell('B3').numFmt = '#,##0';

  dash.getCell('A4').value = 'Motivo Frequente:';
  dash.getCell('A4').font = { bold: true };
  dash.getCell('B4').value = '';

  dash.getCell('A6').value = 'Distribuição por Período';
  dash.getCell('A6').font = { bold: true, size: 12 };
  dash.getCell('A7').value = 'Manhã';
  dash.getCell('B7').value = 0;
  dash.getCell('A8').value = 'Tarde';
  dash.getCell('B8').value = 0;

  dash.getCell('D6').value = 'Distribuição por Nível';
  dash.getCell('D6').font = { bold: true, size: 12 };
  dash.getCell('D7').value = 'Nível';
  dash.getCell('E7').value = 'Total';

  /* ───── Sheet: Registros ───── */
  const reg = workbook.addWorksheet('Registros');
  const headers = ['Data', 'Horário', 'Nível', 'Professor', 'Tipo', 'Motivo', 'Origem'];
  const headerRow = reg.getRow(1);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  };
  headerRow.height = 20;

  reg.columns = [
    { header: 'Data', key: 'data', width: 14 },
    { header: 'Horário', key: 'horario', width: 10 },
    { header: 'Nível', key: 'nivel', width: 18 },
    { header: 'Professor', key: 'professor', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Motivo', key: 'motivo', width: 25 },
    { header: 'Origem', key: 'origem', width: 14 },
  ];

  /* ───── Sheet: Grafico (dados fonte) ───── */
  const graf = workbook.addWorksheet('Grafico');
  graf.getCell('A1').value = 'Motivo';
  graf.getCell('B1').value = 'Total';
  graf.getCell('A2').value = '(exemplo)';
  graf.getCell('B2').value = 0;
  graf.getCell('A1').font = { bold: true };
  graf.getCell('B1').font = { bold: true };

  const outputPath = path.join(templatesDir, 'relatorioCancelamentos.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Template criado em: ${outputPath}`);
}

gerarTemplate().catch(err => {
  console.error('Erro ao gerar template:', err);
  process.exit(1);
});
