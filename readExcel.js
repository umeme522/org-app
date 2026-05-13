import ExcelJS from 'exceljs';

async function readExcel() {
  const filePath = 'C:\\Antigravity\\⑤2026春季コンヘ゜景品.xlsx';
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.readFile(filePath);
    
    workbook.eachSheet((worksheet, sheetId) => {
      console.log(`--- Sheet: ${worksheet.name} ---`);
      
      if (worksheet.name !== '26春') return;
      
      const r = 43;
      const row = worksheet.getRow(r);
      const rowData = [];
      for (let c = 1; c <= 16; c++) {
        rowData.push(row.getCell(c).value);
      }
      console.log(`Row ${r}:`, JSON.stringify(rowData));
      console.log('\n');
    });
  } catch (error) {
    console.error('Error reading excel file:', error);
  }
}

readExcel();
