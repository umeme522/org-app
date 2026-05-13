import ExcelJS from 'exceljs';

async function setExcelFormulas() {
  const filePath = 'C:\\Antigravity\\⑤2026春季コンヘ゜景品.xlsx';
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet('26春');
    
    // N列（品名）がある行に対して、O列とP列に関数を設定
    // 5行目から開始し、N列が空になるまで、あるいは適当な行数まで
    for (let r = 5; r <= 60; r++) {
      const row = worksheet.getRow(r);
      const targetNameCell = row.getCell(14); // N列 (品名)
      
      if (targetNameCell.value) {
        // O列: 本数 (左側の2つの表からSUMIFで合計)
        // 表1: D5:E60, 表2: J5:K60
        row.getCell(15).value = {
          formula: `SUMIF($D$5:$D$60, N${r}, $E$5:$E$60) + SUMIF($J$5:$J$60, N${r}, $K$5:$K$60)`
        };

        // P列: 単位 (左側の2つの表からVLOOKUPで検索)
        // 表1: D5:F60 (3列目が単位), 表2: J5:L60 (3列目が単位)
        row.getCell(16).value = {
          formula: `IFERROR(VLOOKUP(N${r}, $D$5:$F$60, 3, FALSE), IFERROR(VLOOKUP(N${r}, $J$5:$L$60, 3, FALSE), ""))`
        };
        
        console.log(`Set formulas for Row ${r}: ${targetNameCell.value}`);
      }
    }

    await workbook.xlsx.writeFile(filePath);
    console.log('Successfully updated the Excel file with formulas.');
  } catch (error) {
    console.error('Error setting formulas in excel file:', error);
  }
}

setExcelFormulas();
