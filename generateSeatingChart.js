import ExcelJS from 'exceljs';
import path from 'path';

async function generateSeatingChart() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('座席案内表', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      margins: {
        left: 0.7, right: 0.7,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      }
    }
  });

  // スタイル設定
  const titleFont = { size: 20, bold: true };
  const headerFont = { size: 12, bold: true };
  const centerAlign = { vertical: 'middle', horizontal: 'center' };
  const borderStyle = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // タイトル
  worksheet.mergeCells('A1:H2');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '座席案内表（１組目）';
  titleCell.font = titleFont;
  titleCell.alignment = centerAlign;

  // 方角ラベル
  worksheet.getCell('C4').value = '↑ 北 (North)';
  worksheet.getCell('C4').alignment = centerAlign;
  worksheet.getCell('A7').value = '← 西 (West)';
  worksheet.getCell('A7').alignment = centerAlign;

  // メインの座席エリア (例: 1組目の座席をハイライト)
  // 西→北へのスタートを視覚的に表現

  // 座席グリッドの作成
  const startRow = 6;
  const startCol = 3;
  const rows = 10;
  const cols = 5;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = worksheet.getCell(startRow + r, startCol + c);
      cell.border = borderStyle;
      cell.alignment = centerAlign;

      // 仮の座席番号
      cell.value = `席 ${r + 1}-${c + 1}`;
    }
  }

  // 「西→北 スタート」の説明
  worksheet.mergeCells('A18:H19');
  const descCell = worksheet.getCell('A18');
  descCell.value = '【案内順路】 西（左側）から開始し、北（上方向）へ進んでください。';
  descCell.font = { bold: true, color: { argb: 'FFFF0000' } };
  descCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // 1組目の表示
  worksheet.mergeCells('A4:B5');
  const groupCell = worksheet.getCell('A4');
  groupCell.value = '１組目';
  groupCell.font = { size: 14, bold: true };
  groupCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  groupCell.alignment = centerAlign;
  groupCell.border = borderStyle;

  // カラム幅の調整
  worksheet.getColumn(1).width = 15;
  for (let i = 2; i <= 8; i++) {
    worksheet.getColumn(i).width = 12;
  }

  const fileName = '座席案内表_1組目.xlsx';
  await workbook.xlsx.writeFile(fileName);
  console.log(`Successfully generated: ${fileName}`);
}

generateSeatingChart().catch(err => console.error(err));
